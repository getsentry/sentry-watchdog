import { BlacklightEvent } from './types';
export declare const generateReport: (reportType: any, messages: any, dataDir: any, url: any) => any;
export declare const reportCanvasFingerprinters: (eventData: BlacklightEvent[]) => {
    fingerprinters: string[];
    texts: any;
    styles: any;
    data_url: any;
};
export declare const reportCanvasFontFingerprinters: (eventData: BlacklightEvent[]) => {
    canvas_font: {};
    text_measure: {};
};
export declare const reportCookieEvents: (eventData: BlacklightEvent[], dataDir: any, url: any) => any;
