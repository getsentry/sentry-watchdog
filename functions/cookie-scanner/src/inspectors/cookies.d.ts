import { Page } from 'puppeteer';
export declare const setupHttpCookieCapture: (page: any, eventHandler: any) => Promise<void>;
export declare const clearCookiesCache: (page: Page) => Promise<void>;
export declare const getJsCookies: (events: any, url: any) => any;
export declare const matchCookiesToEvents: (cookies: any, events: any, url: any) => any;
export declare const captureBrowserCookies: (page: any, outDir: any, filename?: string) => Promise<any>;
export declare const loadBrowserCookies: (dataDir: any, filename?: string) => any;
