"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadBrowserCookies = exports.captureBrowserCookies = exports.matchCookiesToEvents = exports.getJsCookies = exports.getHTTPCookies = exports.clearCookiesCache = exports.setupHttpCookieCapture = void 0;
const fs_1 = require("fs");
const lodash_flatten_1 = __importDefault(require("lodash.flatten"));
const path_1 = require("path");
const tldts_1 = require("tldts");
const tough_cookie_1 = require("tough-cookie");
const utils_1 = require("./utils");
const parseCookie = (cookieStr, fpUrl) => {
    const cookie = tough_cookie_1.Cookie.parse(cookieStr);
    try {
        if (typeof cookie !== 'undefined') {
            if (!!cookie.domain) {
                // what is the domain if not set explicitly?
                // https://stackoverflow.com/a/5258477/1407622
                cookie.domain = (0, tldts_1.getHostname)(fpUrl);
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
                // find mainframe
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
        .filter(m => m.type && m.type.includes('Cookie.HTTP'))
        .map(m => m.data
        .filter(c => c)
        .map(d => ({
        domain: (0, utils_1.hasOwnProperty)(d, 'domain') ? d.domain : (0, tldts_1.getHostname)(url),
        name: d.key,
        path: d.path,
        script: (0, utils_1.getScriptUrl)(m),
        type: 'Cookie.HTTP',
        value: d.value
    }))));
};
exports.getHTTPCookies = getHTTPCookies;
const getJsCookies = (events, url) => {
    return events
        .filter(m => m.type &&
        m.type.includes('JsInstrument.ObjectProperty') &&
        m.data.symbol.includes('cookie') &&
        m.data.operation.startsWith('set') &&
        typeof m.data.value !== 'undefined' &&
        typeof tough_cookie_1.Cookie.parse(m.data.value) !== 'undefined')
        .map(d => {
        const data = parseCookie(d.data.value, url);
        const hasOwnDomain = (0, utils_1.hasOwnProperty)(d, 'domain') && d.domain !== null && d.domain !== undefined;
        const hasOwnName = data && (0, utils_1.hasOwnProperty)(data, 'key') && data.key !== null && data.key !== undefined;
        const hasOwnPath = data && (0, utils_1.hasOwnProperty)(data, 'path') && data.path !== null && data.path !== undefined;
        const hasOwnValue = data && (0, utils_1.hasOwnProperty)(data, 'value') && data.value !== null && data.value !== undefined;
        const script = (0, utils_1.getScriptUrl)(d);
        return {
            domain: hasOwnDomain ? d.domain : (0, tldts_1.getDomain)(url),
            name: hasOwnName ? data.key : '',
            path: hasOwnPath ? data.path : '',
            script,
            type: d.type,
            value: hasOwnValue ? data.value : ''
        };
    });
};
exports.getJsCookies = getJsCookies;
const matchCookiesToEvents = (cookies, events, url) => {
    const jsCookies = (0, exports.getJsCookies)(events, url);
    const httpCookie = (0, exports.getHTTPCookies)(events, url);
    if (cookies.length < 1) {
        const js = jsCookies
            .map(j => ({
            ...j,
            third_party: (0, tldts_1.getDomain)(url) !== (0, tldts_1.getDomain)(`cookie://${j.domain}${j.path}`),
            type: 'js'
        }))
            .filter((thing, index, self) => index ===
            self.findIndex(t => t.name === thing.name && t.domain === thing.domain
            // t.value === thing.value
            ));
        const http = httpCookie
            .map(j => ({
            ...j,
            third_party: (0, tldts_1.getDomain)(url) !== (0, tldts_1.getDomain)(`cookie://${j.domain}${j.path}`),
            type: 'http'
        }))
            .filter((thing, index, self) => index === self.findIndex(t => t.name === thing.name && t.domain === thing.domain && t.value === thing.value));
        return [...js, ...http];
    }
    const final = cookies.map(b => {
        const h = httpCookie.find((c) => b.name === c.name && b.domain === c.domain && b.value === c.value);
        const j = jsCookies.find((c) => b.name === c.name && b.domain === c.domain && b.value === c.value);
        let type = '';
        if (typeof h !== 'undefined' && typeof j !== 'undefined') {
            // console.log(`${JSON.stringify(b)} found in http and js instruments`);
            type = 'both';
        }
        else if (typeof h !== 'undefined') {
            type = 'http';
        }
        else if (typeof j !== 'undefined') {
            type = 'js';
        }
        else {
            // console.log(
            //   `${JSON.stringify(b)} not found in http and js instruments    `
            // );
            type = 'unknown';
        }
        const third_party = (0, tldts_1.getDomain)(url) === (0, tldts_1.getDomain)(`cookie://${b.domain}${b.path}`) ? false : true;
        return { ...b, type, third_party };
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
            // cookie.expiresDays =
            //   Math.round((cookie.expiresUTC - Date.now()) / (10 * 60 * 60 * 24)) /
            //   100;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29va2llLWNvbGxlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvb2tpZS1jb2xsZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsMkJBQTZEO0FBQzdELG9FQUFxQztBQUNyQywrQkFBNEI7QUFFNUIsaUNBQStDO0FBQy9DLCtDQUFzQztBQUN0QyxtQ0FBdUQ7QUFFdkQsTUFBTSxXQUFXLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLEVBQUU7SUFDckMsTUFBTSxNQUFNLEdBQUcscUJBQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDdkMsSUFBSSxDQUFDO1FBQ0QsSUFBSSxPQUFPLE1BQU0sS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2xCLDRDQUE0QztnQkFDNUMsOENBQThDO2dCQUM5QyxNQUFNLENBQUMsTUFBTSxHQUFHLElBQUEsbUJBQVcsRUFBQyxLQUFLLENBQUMsQ0FBQztZQUN2QyxDQUFDO1lBQ0QsT0FBTyxNQUFNLENBQUM7UUFDbEIsQ0FBQzthQUFNLENBQUM7WUFDSixPQUFPLEtBQUssQ0FBQztRQUNqQixDQUFDO0lBQ0wsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDYixPQUFPLEtBQUssQ0FBQztJQUNqQixDQUFDO0FBQ0wsQ0FBQyxDQUFDO0FBRUssTUFBTSxzQkFBc0IsR0FBRyxLQUFLLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxFQUFFO0lBQy9ELE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLEVBQUU7UUFDakMsSUFBSSxDQUFDO1lBQ0QsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUTtnQkFBRSxPQUFPO1lBQy9CLE1BQU0sVUFBVSxHQUFHLFFBQVEs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