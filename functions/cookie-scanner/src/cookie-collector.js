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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29va2llLWNvbGxlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvb2tpZS1jb2xsZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsMkJBQTZEO0FBQzdELG9FQUFxQztBQUNyQywrQkFBNEI7QUFFNUIsaUNBQStDO0FBQy9DLCtDQUFzQztBQUN0QyxtQ0FBdUQ7QUFFdkQsTUFBTSxXQUFXLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLEVBQUU7SUFDckMsTUFBTSxNQUFNLEdBQUcscUJBQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDdkMsSUFBSTtRQUNBLElBQUksT0FBTyxNQUFNLEtBQUssV0FBVyxFQUFFO1lBQy9CLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7Z0JBQ2pCLDRDQUE0QztnQkFDNUMsOENBQThDO2dCQUM5QyxNQUFNLENBQUMsTUFBTSxHQUFHLElBQUEsbUJBQVcsRUFBQyxLQUFLLENBQUMsQ0FBQzthQUN0QztZQUNELE9BQU8sTUFBTSxDQUFDO1NBQ2pCO2FBQU07WUFDSCxPQUFPLEtBQUssQ0FBQztTQUNoQjtLQUNKO0lBQUMsT0FBTyxLQUFLLEVBQUU7UUFDWixPQUFPLEtBQUssQ0FBQztLQUNoQjtBQUNMLENBQUMsQ0FBQztBQUVLLE1BQU0sc0JBQXNCLEdBQUcsS0FBSyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsRUFBRTtJQUMvRCxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxFQUFFO1FBQ2pDLElBQUk7WUFDQSxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDL0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRO2dCQUFFLE9BQU87WUFDL0IsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNuRCxJQUFJLFVBQVUsRUFBRTtnQkFD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