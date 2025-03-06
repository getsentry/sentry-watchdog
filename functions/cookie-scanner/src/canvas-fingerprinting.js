"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCanvasFontFp = exports.getCanvasFp = exports.sortCanvasCalls = void 0;
/**
 *  @fileOverview Utility functions for canvas finerprinting analysis.
 *  Implemented following the Princeton study's methodology.
 */
const utils_1 = require("./utils");
const MIN_CANVAS_IMAGE_WIDTH = 16;
const MIN_CANVAS_IMAGE_HEIGHT = 16;
const MIN_FONT_LIST_SIZE = 50;
const MIN_TEXT_MEASURE_COUNT = 50;
const MIN_TEXT_LENGTH = 10;
/**
 * Return the string that is written onto canvas from function arguments
 * @param arguments
 */
const getCanvasText = (args) => {
    if (!args || !args[0]) {
        return '';
    }
    return args[0].toString();
};
const getTextLength = (text) => {
    // stackoverflow.com/questions/54369513/how-to-count-the-correct-length-of-a-string-with-emojis-in-javascript
    return [...text].length;
};
/**
 * Check if the retrieved pixel data is larger than min. dimensions.
 * {@link https://developer.mozilla.org/en-US/docsz1/Web/API/CanvasRenderingContext2D/getImageData#Parameters | Web API Image Data Parameters}
 * @param arguments
 */
const isGetImageDataDimsTooSmall = (args) => {
    const sw = parseInt(args[2], 10);
    const sh = parseInt(args[3], 10);
    return sw < MIN_CANVAS_IMAGE_WIDTH || sh < MIN_CANVAS_IMAGE_HEIGHT;
};
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
const sortCanvasCalls = (canvasCalls) => {
    const CANVAS_READ_FUNCS = ['HTMLCanvasElement.toDataURL', 'CanvasRenderingContext2D.getImageData'];
    const CANVAS_WRITE_FUNCS = ['CanvasRenderingContext2D.fillText', 'CanvasRenderingContext2D.strokeText'];
    const CANVAS_FP_DO_NOT_CALL_LIST = ['CanvasRenderingContext2D.save', 'CanvasRenderingContext2D.restore', 'HTMLCanvasElement.addEventListener'];
    const cReads = new Map();
    const cDataUrls = new Map();
    const cWrites = new Map();
    const cTexts = new Map();
    const cBanned = new Map();
    const cStyles = new Map();
    for (const item of canvasCalls) {
        const { url, data } = item;
        const url_host = new URL(url).hostname;
        const script_url = (0, utils_1.getScriptUrl)(item);
        const { symbol, operation, value } = data;
        if (typeof script_url === 'undefined' || script_url.indexOf('http:') < -1 || script_url.indexOf('https:') < -1) {
            continue;
        }
        if (CANVAS_READ_FUNCS.includes(symbol) && operation === 'call') {
            if (symbol === 'CanvasRenderingContext2D.getImageData' && isGetImageDataDimsTooSmall(data.arguments)) {
                continue;
            }
            if (symbol === 'HTMLCanvasElement.toDataURL') {
                cDataUrls.has(script_url) ? cDataUrls.get(script_url).add(value) : cDataUrls.set(script_url, new Set([value]));
            }
            cReads.has(script_url) ? cReads.get(script_url).add(url_host) : cReads.set(script_url, new Set([url_host]));
        }
        else if (CANVAS_WRITE_FUNCS.includes(symbol)) {
            const text = getCanvasText(data.arguments);
            if (getTextLength(text) < MIN_TEXT_LENGTH || text.includes('🏴​')) {
                continue;
            }
            cWrites.has(script_url) ? cWrites.get(script_url).add(url_host) : cWrites.set(script_url, new Set([url_host]));
            cTexts.has(script_url) ? cTexts.get(script_url).add(text) : cTexts.set(script_url, new Set([text]));
        }
        else if (symbol === 'CanvasRenderingContext2D.fillStyle' && operation === 'set') {
            cStyles.has(script_url) ? cStyles.get(script_url).add(value) : cStyles.set(script_url, new Set([value]));
        }
        else if (CANVAS_FP_DO_NOT_CALL_LIST.includes(symbol) && operation === 'call') {
            cBanned.has(script_url) ? cBanned.get(script_url).add(url_host) : cBanned.set(script_url, new Set([url_host]));
        }
    }
    return {
        cBanned,
        cDataUrls,
        cReads,
        cStyles,
        cTexts,
        cWrites
    };
};
exports.sortCanvasCalls = sortCanvasCalls;
/**
 * This function takes a list of canvas calls and determines which scripts are fingerprinting
 * @see {@link sortCanvasCalls}
 * @param canvasCalls
 */
const getCanvasFp = (canvasCalls) => {
    const { cDataUrls, cReads, cWrites, cBanned, cTexts, cStyles } = (0, exports.sortCanvasCalls)(canvasCalls);
    const fingerprinters = new Set();
    for (const [script_url, url_hosts] of cReads.entries()) {
        if (fingerprinters.has(script_url)) {
            continue;
        }
        const rwIntersection = new Set([...url_hosts].filter(x => cWrites.has(script_url) && cWrites.get(script_url).has(x)));
        if (rwIntersection.size < 1) {
            continue;
        }
        for (const canvasRwVisit of rwIntersection.values()) {
            if (cBanned.has(script_url) && cBanned.get(script_url).has(canvasRwVisit)) {
                // console.log(
                //   `Ignoring script ${script_url} from url_host ${canvasRwVisit}`
                // );
                continue;
            }
            fingerprinters.add(script_url);
        }
    }
    return {
        data_url: (0, utils_1.serializeCanvasCallMap)(cDataUrls),
        fingerprinters: Array.from(fingerprinters),
        styles: (0, utils_1.serializeCanvasCallMap)(cStyles),
        texts: (0, utils_1.serializeCanvasCallMap)(cTexts)
    };
};
exports.getCanvasFp = getCanvasFp;
const getCanvasFontFp = jsCalls => {
    const CANVAS_FONT = ['CanvasRenderingContext2D.measureText', 'CanvasRenderingContext2D.font'];
    const font_shorthand = /^\s*(?=(?:(?:[-a-z]+\s*){0,2}(italic|oblique))?)(?=(?:(?:[-a-z]+\s*){0,2}(small-caps))?)(?=(?:(?:[-a-z]+\s*){0,2}(bold(?:er)?|lighter|[1-9]00))?)(?:(?:normal|\1|\2|\3)\s*){0,3}((?:xx?-)?(?:small|large)|medium|smaller|larger|[.\d]+(?:\%|in|[cem]m|ex|p[ctx]))(?:\s*\/\s*(normal|[.\d]+(?:\%|in|[cem]m|ex|p[ctx])))?\s*([-_\{\}\(\)\&!\',\*\.\"\sa-zA-Z0-9]+?)\s*$/g;
    const textMeasure = new Map();
    const canvasFont = new Map();
    for (const item of jsCalls) {
        const script_url = (0, utils_1.getScriptUrl)(item);
        const { symbol, value } = item.data;
        if (CANVAS_FONT.includes(symbol)) {
            if (symbol.indexOf('measureText') > -1) {
                const textToMeasure = item.data.arguments[0];
                if (textMeasure.has(script_url)) {
                    textMeasure.get(script_url)[textToMeasure] += 1;
                }
                else {
                    const val = { [textToMeasure]: 1 };
                    textMeasure.set(script_url, val);
                }
            }
            if (symbol.indexOf('font') > -1) {
                if (font_shorthand.test(value)) {
                    canvasFont.has(script_url) ? canvasFont.get(script_url).add(value) : canvasFont.set(script_url, new Set([value]));
                }
            }
        }
    }
    canvasFont.forEach((value, key, map) => {
        if (value.size < MIN_FONT_LIST_SIZE) {
            map.delete(key);
        }
    });
    textMeasure.forEach((value, key, map) => {
        if (value.size < MIN_TEXT_MEASURE_COUNT) {
            map.delete(key);
        }
    });
    return {
        canvas_font: (0, utils_1.serializeCanvasCallMap)(canvasFont),
        text_measure: (0, utils_1.serializeCanvasCallMap)(textMeasure)
    };
};
exports.getCanvasFontFp = getCanvasFontFp;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FudmFzLWZpbmdlcnByaW50aW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2FudmFzLWZpbmdlcnByaW50aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBOzs7R0FHRztBQUVILG1DQUErRDtBQUUvRCxNQUFNLHNCQUFzQixHQUFHLEVBQUUsQ0FBQztBQUNsQyxNQUFNLHVCQUF1QixHQUFHLEVBQUUsQ0FBQztBQUNuQyxNQUFNLGtCQUFrQixHQUFHLEVBQUUsQ0FBQztBQUM5QixNQUFNLHNCQUFzQixHQUFHLEVBQUUsQ0FBQztBQUNsQyxNQUFNLGVBQWUsR0FBRyxFQUFFLENBQUM7QUFDM0I7OztHQUdHO0FBQ0gsTUFBTSxhQUFhLEdBQUcsQ0FBQyxJQUFjLEVBQUUsRUFBRTtJQUNyQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ25CLE9BQU8sRUFBRSxDQUFDO0tBQ2I7SUFDRCxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUM5QixDQUFDLENBQUM7QUFFRixNQUFNLGFBQWEsR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFO0lBQ25DLDZHQUE2RztJQUM3RyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDNUIsQ0FBQyxDQUFDO0FBRUY7Ozs7R0FJRztBQUNILE1BQU0sMEJBQTBCLEdBQUcsQ0FBQyxJQUFjLEVBQUUsRUFBRTtJQUNsRCxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ2pDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDakMsT0FBTyxFQUFFLEdBQUcsc0JBQXNCLElBQUksRUFBRSxHQUFHLHVCQUF1QixDQUFDO0FBQ3ZFLENBQUMsQ0FBQztB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