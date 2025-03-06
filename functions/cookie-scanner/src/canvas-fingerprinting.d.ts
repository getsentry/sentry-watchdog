import { BlacklightEvent } from './types';
type ScriptUrl = string;
type CanvasCallValue = string;
type CanvasCallMap = Map<ScriptUrl, Set<CanvasCallValue>>;
/**
 * This function takes a list of Javascript calls to HTML Canvas properties from a browsers window object.
 * It sorts the functions in order to evaluate which script are fingerprinting a browser using the criteria
 * described by Englehardt & Narayanan, 2016
 * We Filter for 4 Criteria
 * Criteria 1: The canvas element’s height and width properties must not be set below 16
 * Criteria 2: Text must be written to canvas with least two colors or at least 10 distinct charachters
 * Criteria 3: The script should not call the save, restore, or addEventListener  methods of the rendering context.
 * Criteria 4: The script extracts an image withtoDataURL or with a single call togetImageData that specifies an area with a minimum size of 16px×16px
 * @param canvasCalls
 * @see {@link http://randomwalker.info/publications/OpenWPM_1_million_site_tracking_measurement.pdf#page=12}
 */
export declare const sortCanvasCalls: (canvasCalls: BlacklightEvent[]) => {
    cBanned: CanvasCallMap;
    cDataUrls: CanvasCallMap;
    cReads: CanvasCallMap;
    cStyles: CanvasCallMap;
    cTexts: CanvasCallMap;
    cWrites: CanvasCallMap;
};
/**
 * This function takes a list of canvas calls and determines which scripts are fingerprinting
 * @see {@link sortCanvasCalls}
 * @param canvasCalls
 */
export declare const getCanvasFp: (canvasCalls: any) => {
    fingerprinters: string[];
    texts: any;
    styles: any;
    data_url: any;
};
export declare const getCanvasFontFp: (jsCalls: any) => {
    canvas_font: {};
    text_measure: {};
};
export {};
