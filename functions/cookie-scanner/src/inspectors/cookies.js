"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadBrowserCookies = exports.captureBrowserCookies = exports.matchCookiesToEvents = exports.getJsCookies = exports.clearCookiesCache = exports.setupHttpCookieCapture = void 0;
const fs_1 = require("fs");
const lodash_flatten_1 = __importDefault(require("lodash.flatten"));
const path_1 = require("path");
const tldts_1 = require("tldts");
const tough_cookie_1 = require("tough-cookie");
const utils_1 = require("../helpers/utils");
const parseCookie = (cookieStr, url) => {
    const cookie = tough_cookie_1.Cookie.parse(cookieStr);
    try {
        if (typeof cookie !== 'undefined') {
            if (!!cookie.domain) {
                // what is the domain if not set explicitly?
                // https://stackoverflow.com/a/5258477/1407622
                cookie.domain = (0, tldts_1.getHostname)(url);
            }
            return cookie;
        }
        else {
            return false;
        }
    }
    catch (error) {
        return false;
    }
};
const setupHttpCookieCapture = async (page, eventHandler) => {
    await page.on('response', response => {
        try {
            const req = response.request();
            if (!response._headers)
                return;
            const cookieHTTP = response._headers['set-cookie'];
            if (cookieHTTP) {
                const stack = [
                    {
                        fileName: req.url(),
                        source: `set in Set-Cookie HTTP response header for ${req.url()}`
                    }
                ];
                const splitCookieHeaders = cookieHTTP.split('\n');
                const data = splitCookieHeaders.map(c => parseCookie(c, req.url()));
                // find main frame
                let frame = response.frame();
                while (frame.parentFrame()) {
                    frame = frame.parentFrame();
                }
                eventHandler({
                    data,
                    raw: cookieHTTP,
                    stack,
                    type: 'Cookie.HTTP',
                    url: frame.url() // or page.url(), // (can be about:blank if the request is issued by browser.goto)
                });
            }
        }
        catch (error) {
            console.log(error);
        }
    });
};
exports.setupHttpCookieCapture = setupHttpCookieCapture;
const clearCookiesCache = async (page) => {
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    await client.send('Network.clearBrowserCache');
    await client.detach();
};
exports.clearCookiesCache = clearCookiesCache;
const getHTTPCookies = (events, url) => {
    return (0, lodash_flatten_1.default)(events
        .filter(event => event.type && event.type.includes('Cookie.HTTP'))
        .map(event => event.data
        .filter(c => c)
        .map(data => ({
        domain: (0, utils_1.hasOwnProperty)(data, 'domain') ? data.domain : (0, tldts_1.getHostname)(url),
        name: data.key,
        path: data.path,
        script: (0, utils_1.getScriptUrl)(event),
        type: 'Cookie.HTTP',
        value: data.value
    }))));
};
const getJsCookies = (events, url) => {
    return events
        .filter(event => event.type &&
        event.type.includes('JsInstrument.ObjectProperty') &&
        event.data.symbol.includes('cookie') &&
        event.data.operation.startsWith('set') &&
        typeof event.data.value !== 'undefined' &&
        (event.data.value === '' || typeof tough_cookie_1.Cookie.parse(event.data.value) !== 'undefined'))
        .map(event => {
        const data = event.data.value && tough_cookie_1.Cookie.parse(event.data.value) ? parseCookie(event.data.value, url) : null;
        const hasOwnDomain = (0, utils_1.hasOwnProperty)(event, 'domain') && event.domain !== null && event.domain !== undefined;
        const hasOwnName = data && (0, utils_1.hasOwnProperty)(data, 'key') && data.key !== null && data.key !== undefined;
        const hasOwnPath = data && (0, utils_1.hasOwnProperty)(data, 'path') && data.path !== null && data.path !== undefined;
        const hasOwnValue = data && (0, utils_1.hasOwnProperty)(data, 'value') && data.value !== null && data.value !== undefined;
        const script = (0, utils_1.getScriptUrl)(event);
        return {
            domain: hasOwnDomain ? event.domain : (0, tldts_1.getDomain)(url),
            name: hasOwnName ? data.key : '',
            path: hasOwnPath ? data.path : '',
            script,
            type: event.type,
            value: hasOwnValue ? data.value : ''
        };
    });
};
exports.getJsCookies = getJsCookies;
const matchCookiesToEvents = (cookies, events, url) => {
    const jsCookies = (0, exports.getJsCookies)(events, url);
    const httpCookie = getHTTPCookies(events, url);
    if (cookies.length < 1) {
        const js = jsCookies
            .map(jsCookie => ({
            ...jsCookie,
            third_party: (0, tldts_1.getDomain)(url) !== (0, tldts_1.getDomain)(`cookie://${jsCookie.domain}${jsCookie.path}`),
            type: 'js'
        }))
            .filter((thing, index, self) => index === self.findIndex(t => t.name === thing.name && t.domain === thing.domain));
        const http = httpCookie
            .map(httpCookie => ({
            ...httpCookie,
            third_party: (0, tldts_1.getDomain)(url) !== (0, tldts_1.getDomain)(`cookie://${httpCookie.domain}${httpCookie.path}`),
            type: 'http'
        }))
            .filter((thing, index, self) => index === self.findIndex(t => t.name === thing.name && t.domain === thing.domain && t.value === thing.value));
        return [...js, ...http];
    }
    const final = cookies.map(cookie => {
        const isHttpCookie = httpCookie.find((c) => cookie.name === c.name && cookie.domain === c.domain && cookie.value === c.value);
        const isJsCookie = jsCookies.find((c) => cookie.name === c.name && cookie.domain === c.domain && cookie.value === c.value);
        let type = '';
        if (typeof isHttpCookie !== 'undefined' && typeof isJsCookie !== 'undefined') {
            type = 'both';
        }
        else if (typeof isHttpCookie !== 'undefined') {
            type = 'http';
        }
        else if (typeof isJsCookie !== 'undefined') {
            type = 'js';
        }
        else {
            type = 'unknown';
        }
        const third_party = (0, tldts_1.getDomain)(url) === (0, tldts_1.getDomain)(`cookie://${cookie.domain}${cookie.path}`) ? false : true;
        return { ...cookie, type, third_party };
    });
    return final.sort((a, b) => b.expires - a.expires);
};
exports.matchCookiesToEvents = matchCookiesToEvents;
// NOTE: There is a bug in chrome that prevents us from catching all the cookies being set using its instrumentation
// https://blog.ermer.de/2018/06/11/chrome-67-provisional-headers-are-shown/
// The following call using the dev tools protocol ensures we get all the cookies even if we cant trace the source for each call
const captureBrowserCookies = async (page, outDir, filename = 'browser-cookies.json') => {
    const client = await page.target().createCDPSession();
    const browser_cookies = (await client.send('Network.getAllCookies')).cookies.map(cookie => {
        if (cookie.expires > -1) {
            // add derived attributes for convenience
            cookie.expires = new Date(cookie.expires * 1000);
        }
        cookie.domain = cookie.domain.replace(/^\./, ''); // normalise domain value
        return cookie;
    });
    await client.detach();
    try {
        (0, fs_1.writeFileSync)((0, utils_1.safePath)(outDir, filename), JSON.stringify({ browser_cookies }, null, 2));
    }
    catch (error) {
        console.log(error);
        console.log('Couldnt save browser cookies to file');
    }
    return browser_cookies;
};
exports.captureBrowserCookies = captureBrowserCookies;
const loadBrowserCookies = (dataDir, filename = 'browser-cookies.json') => {
    try {
        const sanitizedFilename = (0, path_1.basename)(filename);
        const filePath = (0, utils_1.safePath)(dataDir, sanitizedFilename);
        if ((0, fs_1.existsSync)(filePath)) {
            const cookies = JSON.parse((0, fs_1.readFileSync)(filePath, 'utf-8'));
            return cookies.browser_cookies || [];
        }
        else {
            return [];
        }
    }
    catch (error) {
        console.log('Couldnt load browser cookies');
        console.log(error);
        return [];
    }
};
exports.loadBrowserCookies = loadBrowserCookies;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29va2llcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvb2tpZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsMkJBQTZEO0FBQzdELG9FQUFxQztBQUNyQywrQkFBZ0M7QUFHaEMsaUNBQStDO0FBQy9DLCtDQUFzQztBQUN0Qyw0Q0FBMEU7QUFFMUUsTUFBTSxXQUFXLEdBQUcsQ0FBQyxTQUFpQixFQUFFLEdBQVcsRUFBRSxFQUFFO0lBQ25ELE1BQU0sTUFBTSxHQUFHLHFCQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3ZDLElBQUksQ0FBQztRQUNELElBQUksT0FBTyxNQUFNLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDaEMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNsQiw0Q0FBNEM7Z0JBQzVDLDhDQUE4QztnQkFDOUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxJQUFBLG1CQUFXLEVBQUMsR0FBRyxDQUFDLENBQUM7WUFDckMsQ0FBQztZQUNELE9BQU8sTUFBTSxDQUFDO1FBQ2xCLENBQUM7YUFBTSxDQUFDO1lBQ0osT0FBTyxLQUFLLENBQUM7UUFDakIsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2IsT0FBTyxLQUFLLENBQUM7SUFDakIsQ0FBQztBQUNMLENBQUMsQ0FBQztBQUVLLE1BQU0sc0JBQXNCLEdBQUcsS0FBSyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsRUFBRTtJQUMvRCxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxFQUFFO1FBQ2pDLElBQUksQ0FBQztZQUNELE1BQU0sR0FBRyxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVE7Z0JBQUUsT0FBTztZQUMvQixNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLFlB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