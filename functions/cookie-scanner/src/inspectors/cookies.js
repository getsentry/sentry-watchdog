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
        typeof tough_cookie_1.Cookie.parse(event.data.value) !== 'undefined')
        .map(event => {
        const data = parseCookie(event.data.value, url);
        const hasOwnDomain = (0, utils_1.hasOwnProperty)(event, 'domain') &&
            event.domain !== null &&
            event.domain !== undefined;
        const hasOwnName = data &&
            (0, utils_1.hasOwnProperty)(data, 'key') &&
            data.key !== null &&
            data.key !== undefined;
        const hasOwnPath = data &&
            (0, utils_1.hasOwnProperty)(data, 'path') &&
            data.path !== null &&
            data.path !== undefined;
        const hasOwnValue = data &&
            (0, utils_1.hasOwnProperty)(data, 'value') &&
            data.value !== null &&
            data.value !== undefined;
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
        (0, fs_1.writeFileSync)((0, path_1.join)(outDir, filename), JSON.stringify({ browser_cookies }, null, 2));
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
        if ((0, fs_1.existsSync)((0, path_1.join)(dataDir, filename))) {
            const cookies = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(dataDir, filename), 'utf-8'));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29va2llcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvb2tpZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsMkJBQTZEO0FBQzdELG9FQUFxQztBQUNyQywrQkFBNEI7QUFFNUIsaUNBQStDO0FBQy9DLCtDQUFzQztBQUN0Qyw0Q0FBZ0U7QUFFaEUsTUFBTSxXQUFXLEdBQUcsQ0FBQyxTQUFnQixFQUFFLEdBQVUsRUFBRSxFQUFFO0lBQ2pELE1BQU0sTUFBTSxHQUFHLHFCQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3ZDLElBQUk7UUFDQSxJQUFJLE9BQU8sTUFBTSxLQUFLLFdBQVcsRUFBRTtZQUMvQixJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO2dCQUNqQiw0Q0FBNEM7Z0JBQzVDLDhDQUE4QztnQkFDOUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxJQUFBLG1CQUFXLEVBQUMsR0FBRyxDQUFDLENBQUM7YUFDcEM7WUFDRCxPQUFPLE1BQU0sQ0FBQztTQUNqQjthQUFNO1lBQ0gsT0FBTyxLQUFLLENBQUM7U0FDaEI7S0FDSjtJQUFDLE9BQU8sS0FBSyxFQUFFO1FBQ1osT0FBTyxLQUFLLENBQUM7S0FDaEI7QUFDTCxDQUFDLENBQUM7QUFFSyxNQUFNLHNCQUFzQixHQUFHLEtBQUssRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLEVBQUU7SUFDL0QsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsRUFBRTtRQUNqQyxJQUFJO1lBQ0EsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUTtnQkFBRSxPQUFPO1lBQy9CLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDbkQsSUFBSSxVQUFVLEVBQUU7Z0JBQ1osTUFBTSxLQUFLLEdBQUc7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