/**
 *  @fileOverview Utility functions for canvas finerprinting analysis.
 *  Implemented following the Princeton study's methodology.
 */
import { BlacklightEvent, CanvasCallMap } from './types';
/**
 * This function takes a list of Javascript calls to HTML Canvas properties from a browser's window object.
 * It sorts the functions in order to evaluate which script are fingerprinting a browser using the criteria
 * described by Englehardt & Narayanan, 2016
 * We Filter for 4 Criteria
 * Criteria 1: The canvas element’s height and width properties must not be set below 16px
 * Criteria 2: Text must be written to canvas with least two colors or at least 10 distinct characters
 * Criteria 3: The script should not call the save, restore, or addEventListener methods of the rendering context.
 * Criteria 4: The script extracts an image with toDataURL or with a single call to getImageData that specifies an area with a minimum size of 16px×16px
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
export declare const getCanvasFingerprinters: (canvasCalls: any) => {
    fingerprinters: string[];
    texts: any;
    styles: any;
    data_url: any;
};
export declare const getCanvasFontFingerprinters: (jsCalls: any) => {
    canvas_font: {};
    text_measure: {};
};
