"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCanvasFontFingerprinters = exports.getCanvasFingerprinters = exports.sortCanvasCalls = void 0;
const utils_1 = require("./helpers/utils");
const MIN_CANVAS_IMAGE_WIDTH = 16;
const MIN_CANVAS_IMAGE_HEIGHT = 16;
const MIN_FONT_LIST_SIZE = 50;
const MIN_TEXT_MEASURE_COUNT = 50;
const MIN_TEXT_LENGTH = 10;
const CANVAS_READ_FUNCS = ['HTMLCanvasElement.toDataURL', 'CanvasRenderingContext2D.getImageData'];
const CANVAS_WRITE_FUNCS = ['CanvasRenderingContext2D.fillText', 'CanvasRenderingContext2D.strokeText'];
const CANVAS_FP_DO_NOT_CALL_LIST = ['CanvasRenderingContext2D.save', 'CanvasRenderingContext2D.restore', 'HTMLCanvasElement.addEventListener'];
const CANVAS_FONT = ['CanvasRenderingContext2D.measureText', 'CanvasRenderingContext2D.font'];
/**
 * Return the string that is written onto canvas from function arguments
 * @param args
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
 * @param args
 */
const isImageTooSmall = (args) => {
    const width = parseInt(args[2], 10);
    const height = parseInt(args[3], 10);
    return width < MIN_CANVAS_IMAGE_WIDTH || height < MIN_CANVAS_IMAGE_HEIGHT;
};
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
const sortCanvasCalls = (canvasCalls) => {
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
            if (symbol === 'CanvasRenderingContext2D.getImageData' && isImageTooSmall(data.arguments)) {
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
const getCanvasFingerprinters = (canvasCalls) => {
    const fingerprinters = new Set();
    const { cDataUrls, cReads, cWrites, cBanned, cTexts, cStyles } = (0, exports.sortCanvasCalls)(canvasCalls);
    for (const [script_url, url_hosts] of cReads.entries()) {
        if (fingerprinters.has(script_url))
            continue;
        const rwIntersection = new Set([...url_hosts].filter(x => cWrites.has(script_url) && cWrites.get(script_url).has(x)));
        if (rwIntersection.size < 1)
            continue;
        for (const canvasRwVisit of rwIntersection.values()) {
            if (cBanned.has(script_url) && cBanned.get(script_url).has(canvasRwVisit)) {
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
exports.getCanvasFingerprinters = getCanvasFingerprinters;
const getCanvasFontFingerprinters = jsCalls => {
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
exports.getCanvasFontFingerprinters = getCanvasFontFingerprinters;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FudmFzLWZpbmdlcnByaW50aW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2FudmFzLWZpbmdlcnByaW50aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUtBLDJDQUF1RTtBQUV2RSxNQUFNLHNCQUFzQixHQUFHLEVBQUUsQ0FBQztBQUNsQyxNQUFNLHVCQUF1QixHQUFHLEVBQUUsQ0FBQztBQUNuQyxNQUFNLGtCQUFrQixHQUFHLEVBQUUsQ0FBQztBQUM5QixNQUFNLHNCQUFzQixHQUFHLEVBQUUsQ0FBQztBQUNsQyxNQUFNLGVBQWUsR0FBRyxFQUFFLENBQUM7QUFFM0IsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLDZCQUE2QixFQUFFLHVDQUF1QyxDQUFDLENBQUM7QUFDbkcsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLG1DQUFtQyxFQUFFLHFDQUFxQyxDQUFDLENBQUM7QUFDeEcsTUFBTSwwQkFBMEIsR0FBRyxDQUFDLCtCQUErQixFQUFFLGtDQUFrQyxFQUFFLG9DQUFvQyxDQUFDLENBQUM7QUFDL0ksTUFBTSxXQUFXLEdBQUcsQ0FBQyxzQ0FBc0MsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDO0FBRTlGOzs7R0FHRztBQUNILE1BQU0sYUFBYSxHQUFHLENBQUMsSUFBYyxFQUFFLEVBQUU7SUFDckMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNuQixPQUFPLEVBQUUsQ0FBQztLQUNiO0lBQ0QsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDOUIsQ0FBQyxDQUFDO0FBRUYsTUFBTSxhQUFhLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRTtJQUNuQyw2R0FBNkc7SUFDN0csT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQzVCLENBQUMsQ0FBQztBQUVGOzs7O0dBSUc7QUFDSCxNQUFNLGVBQWUsR0FBRyxDQUFDLElBQWMs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