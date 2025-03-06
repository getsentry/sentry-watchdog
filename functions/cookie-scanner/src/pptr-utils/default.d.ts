import { Page } from 'puppeteer';
export declare const savePageContent: (index: any, outDir: any, page: Page, screenshot?: boolean) => Promise<void>;
/**
 * Default Puppeteer options for dev
 */
export declare const defaultPuppeteerBrowserOptions: {
    args: string[];
    defaultViewport: any;
    headless: boolean;
};
export declare const SOCIAL_URLS: string[];
