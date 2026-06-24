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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29va2llcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvb2tpZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsMkJBQTZEO0FBQzdELG9FQUFxQztBQUNyQywrQkFBZ0M7QUFHaEMsaUNBQStDO0FBQy9DLCtDQUFzQztBQUN0Qyw0Q0FBMEU7QUFFMUUsTUFBTSxXQUFXLEdBQUcsQ0FBQyxTQUFnQixFQUFFLEdBQVUsRUFBRSxFQUFFO0lBQ2pELE1BQU0sTUFBTSxHQUFHLHFCQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3ZDLElBQUk7UUFDQSxJQUFJLE9BQU8sTUFBTSxLQUFLLFdBQVcsRUFBRTtZQUMvQixJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO2dCQUNqQiw0Q0FBNEM7Z0JBQzVDLDhDQUE4QztnQkFDOUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxJQUFBLG1CQUFXLEVBQUMsR0FBRyxDQUFDLENBQUM7YUFDcEM7WUFDRCxPQUFPLE1BQU0sQ0FBQztTQUNqQjthQUFNO1lBQ0gsT0FBTyxLQUFLLENBQUM7U0FDaEI7S0FDSjtJQUFDLE9BQU8sS0FBSyxFQUFFO1FBQ1osT0FBTyxLQUFLLENBQUM7S0FDaEI7QUFDTCxDQUFDLENBQUM7QUFFSyxNQUFNLHNCQUFzQixHQUFHLEtBQUssRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLEVBQUU7SUFDL0QsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsRUFBRTtRQUNqQyxJQUFJO1lBQ0EsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUTtnQkFBRSxPQUFPO1lBQy9CLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDbkQsSUFBSSxVQUFVLEVBQUU7Z0JBQ1osTUFBTSxLQUFLLEdBQUc7b0JBQ1Y7d0JBQ0ksUUFBUSxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUU7d0JBQ25CLE1BQU0sRUFBRSw4Q0FBOEMsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFO3FCQUNwRTtpQkFDSixDQUFDO2dCQUNGLE1BQU0sa0JBQWtCLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbEQsTUFBTSxJQUFJLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNwRSxrQkFBa0I7Z0JBQ2xCLElBQUksS0FBSyxHQUFHLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDN0IsT0FBTyxLQUFLLENBQUMsV0FBVyxFQUFFLEVBQUU7b0JBQ3hCLEtBQUssR0FBRyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7aUJBQy9CO2dCQUVELFlBQVksQ0FBQztvQkFDVCxJQUFJO29CQUNKLEdBQUcsRUFBRSxVQUFVO29CQUNmLEtBQUs7b0JBQ0wsSUFBSSxFQUFFLGFBQWE7b0JBQ25CLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsa0ZBQWtGO2lCQUN0RyxDQUFDLENBQUM7YUFDTjtTQUNKO1FBQUMsT0FBTyxLQUFLLEVBQUU7WUFDWixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ3RCO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUM7QUFqQ1csUUFBQSxzQkFBc0IsMEJBaUNqQztBQUVLLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxFQUFFLElBQVUsRUFBRSxFQUFFO0lBQ2xELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDdEQsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFDakQsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7SUFDL0MsTUFBTSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDMUIsQ0FBQyxDQUFDO0FBTFcsUUFBQSxpQkFBaUIscUJBSzVCO0FBRUYsTUFBTSxjQUFjLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFTLEVBQUU7SUFDMUMsT0FBTyxJQUFBLHdCQUFPLEVBQ1YsTUFBTTtTQUNELE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUM7U0FDakUsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQ1QsS0FBSyxDQUFDLElBQUk7U0FDTCxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDZCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ1YsTUFBTSxFQUFFLElBQUEsc0JBQWMsRUFBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUEsbUJBQVcsRUFBQyxHQUFHLENBQUM7UUFDdkUsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHO1FBQ2QsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1FBQ2YsTUFBTSxFQUFFLElBQUEsb0JBQVksRUFBQyxLQUFLLENBQUM7UUFDM0IsSUFBSSxFQUFFLGFBQWE7UUFDbkIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO0tBQ3BCLENBQUMsQ0FBQyxDQUNWLENBQ1IsQ0FBQztBQUNOLENBQUMsQ0FBQztBQUVLLE1BQU0sWUFBWSxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxFQUFFO0lBQ3hDLE9BQU8sTUFBTTtTQUNSLE1BQU0sQ0FDSCxLQUFLLENBQUMsRUFBRSxDQUNKLEtBQUssQ0FBQyxJQUFJO1FBQ1YsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsNkJBQTZCLENBQUM7UUFDbEQsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztRQUNwQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDO1FBQ3RDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssV0FBVztRQUN2QyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLEVBQUUsSUFBSSxPQUFPLHFCQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssV0FBVyxDQUFDLENBQ3pGO1NBQ0EsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQ1QsTUFBTSxJQUFJLEdBQVcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUkscUJBQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDcEgsTUFBTSxZQUFZLEdBQUcsSUFBQSxzQkFBYyxFQUFDLEtBQUssRUFBRSxRQUFRLENBQUM7WUFDL0IsS0FBSyxDQUFDLE1BQU0sS0FBSyxJQUFJO1lBQ3JCLEtBQUssQ0FBQyxNQUFNLEtBQUssU0FBUyxDQUFDO1FBQ2hELE1BQU0sVUFBVSxHQUFLLElBQUk7WUFDSixJQUFBLHNCQUFjLEVBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQztZQUMzQixJQUFJLENBQUMsR0FBRyxLQUFLLElBQUk7WUFDakIsSUFBSSxDQUFDLEdBQUcsS0FBSyxTQUFTLENBQUM7UUFDNUMsTUFBTSxVQUFVLEdBQUssSUFBSTtZQUNKLElBQUEsc0JBQWMsRUFBQyxJQUFJLEVBQUUsTUFBTSxDQUFDO1lBQzVCLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSTtZQUNsQixJQUFJLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQztRQUM3QyxNQUFNLFdBQVcsR0FBSSxJQUFJO1lBQ0osSUFBQSxzQkFBYyxFQUFDLElBQUksRUFBRSxPQUFPLENBQUM7WUFDN0IsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJO1lBQ25CLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUyxDQUFDO1FBQzlDLE1BQU0sTUFBTSxHQUFTLElBQUEsb0JBQVksRUFBQyxLQUFLLENBQUMsQ0FBQztRQUV6QyxPQUFPO1lBQ0gsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBQSxpQkFBUyxFQUFDLEdBQUcsQ0FBQztZQUNwRCxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ2hDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDakMsTUFBTTtZQUNOLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtZQUNoQixLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO1NBQ3ZDLENBQUM7SUFDTixDQUFDLENBQUMsQ0FBQztBQUNYLENBQUMsQ0FBQztBQXZDVyxRQUFBLFlBQVksZ0JBdUN2QjtBQUVLLE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxFQUFFO0lBQ3pELE1BQU0sU0FBUyxHQUFHLElBQUEsb0JBQVksRUFBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDNUMsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztJQUUvQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3BCLE1BQU0sRUFBRSxHQUFHLFNBQVM7YUFDZixHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2QsR0FBRyxRQUFRO1lBQ1gsV0FBVyxFQUFFLElBQUEsaUJBQVMsRUFBQyxHQUFHLENBQUMsS0FBSyxJQUFBLGlCQUFTLEVBQUMsWUFBWSxRQUFRLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN4RixJQUFJLEVBQUUsSUFBSTtTQUNiLENBQUMsQ0FBQzthQUNGLE1BQU0sQ0FDSCxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FDbkIsS0FBSyxLQUFLLElBQUksQ0FBQyxTQUFTLENBQ3BCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssS0FBSyxDQUFDLE1BQU0sQ0FDMUQsQ0FDUixDQUFDO1FBQ04sTUFBTSxJQUFJLEdBQUcsVUFBVTthQUNsQixHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2hCLEdBQUcsVUFBVTtZQUNiLFdBQVcsRUFBRSxJQUFBLGlCQUFTLEVBQUMsR0FBRyxDQUFDLEtBQUssSUFBQSxpQkFBUyxFQUFDLFlBQVksVUFBVSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDNUYsSUFBSSxFQUFFLE1BQU07U0FDZixDQUFDLENBQUM7YUFDRixNQUFNLENBQ0gsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLENBQ25CLEtBQUssS0FBSyxJQUFJLENBQUMsU0FBUyxDQUNwQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUMsS0FBSyxDQUNyRixDQUNSLENBQUM7UUFDTixPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztLQUMzQjtJQUNELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDL0IsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsSUFBSSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLE1BQU0sSUFBSSxNQUFNLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNuSSxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRWhJLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNkLElBQUksT0FBTyxZQUFZLEtBQUssV0FBVyxJQUFJLE9BQU8sVUFBVSxLQUFLLFdBQVcsRUFBRTtZQUMxRSxJQUFJLEdBQUcsTUFBTSxDQUFDO1NBQ2pCO2FBQU0sSUFBSSxPQUFPLFlBQVksS0FBSyxXQUFXLEVBQUU7WUFDNUMsSUFBSSxHQUFHLE1BQU0sQ0FBQztTQUNqQjthQUFNLElBQUksT0FBTyxVQUFVLEtBQUssV0FBVyxFQUFFO1lBQzFDLElBQUksR0FBRyxJQUFJLENBQUM7U0FDZjthQUFNO1lBQ0gsSUFBSSxHQUFHLFNBQVMsQ0FBQztTQUNwQjtRQUVELE1BQU0sV0FBVyxHQUFHLElBQUEsaUJBQVMsRUFBQyxHQUFHLENBQUMsS0FBSyxJQUFBLGlCQUFTLEVBQUMsWUFBWSxNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUMzRyxPQUFPLEVBQUUsR0FBRyxNQUFNLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDO0lBQzVDLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdkQsQ0FBQyxDQUFDO0FBbERXLFFBQUEsb0JBQW9CLHdCQWtEL0I7QUFFRixvSEFBb0g7QUFDcEgsNEVBQTRFO0FBQzVFLGdJQUFnSTtBQUN6SCxNQUFNLHFCQUFxQixHQUFHLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsR0FBRyxzQkFBc0IsRUFBRSxFQUFFO0lBQzNGLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLGdCQUFnQixFQUFFLENBQUM7SUFDdEQsTUFBTSxlQUFlLEdBQUcsQ0FBQyxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDdEYsSUFBSSxNQUFNLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxFQUFFO1lBQ3JCLHlDQUF5QztZQUN6QyxNQUFNLENBQUMsT0FBTyxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUM7U0FDcEQ7UUFDRCxNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLHlCQUF5QjtRQUMzRSxPQUFPLE1BQU0sQ0FBQztJQUNsQixDQUFDLENBQUMsQ0FBQztJQUNILE1BQU0sTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ3RCLElBQUk7UUFDQSxJQUFBLGtCQUFhLEVBQUMsSUFBQSxnQkFBUSxFQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsZUFBZSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDM0Y7SUFBQyxPQUFPLEtBQUssRUFBRTtRQUNaLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO0tBQ3ZEO0lBQ0QsT0FBTyxlQUFlLENBQUM7QUFDM0IsQ0FBQyxDQUFDO0FBbEJXLFFBQUEscUJBQXFCLHlCQWtCaEM7QUFFSyxNQUFNLGtCQUFrQixHQUFHLENBQUMsT0FBZSxFQUFFLFFBQVEsR0FBRyxzQkFBc0IsRUFBRSxFQUFFO0lBQ3JGLElBQUk7UUFDQSxNQUFNLGlCQUFpQixHQUFHLElBQUEsZUFBUSxFQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sUUFBUSxHQUFHLElBQUEsZ0JBQVEsRUFBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUN0RCxJQUFJLElBQUEsZUFBVSxFQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ3RCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBQSxpQkFBWSxFQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzVELE9BQU8sT0FBTyxDQUFDLGVBQWUsSUFBSSxFQUFFLENBQUM7U0FDeEM7YUFBTTtZQUNILE9BQU8sRUFBRSxDQUFDO1NBQ2I7S0FDSjtJQUFDLE9BQU8sS0FBSyxFQUFFO1FBQ1osT0FBTyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1FBQzVDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkIsT0FBTyxFQUFFLENBQUM7S0FDYjtBQUNMLENBQUMsQ0FBQztBQWZXLFFBQUEsa0JBQWtCLHNCQWU3QiJ9