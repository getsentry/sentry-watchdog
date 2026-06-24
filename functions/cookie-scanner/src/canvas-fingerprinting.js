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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FudmFzLWZpbmdlcnByaW50aW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2FudmFzLWZpbmdlcnByaW50aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUtBLDJDQUF1RTtBQUV2RSxNQUFNLHNCQUFzQixHQUFHLEVBQUUsQ0FBQztBQUNsQyxNQUFNLHVCQUF1QixHQUFHLEVBQUUsQ0FBQztBQUNuQyxNQUFNLGtCQUFrQixHQUFHLEVBQUUsQ0FBQztBQUM5QixNQUFNLHNCQUFzQixHQUFHLEVBQUUsQ0FBQztBQUNsQyxNQUFNLGVBQWUsR0FBRyxFQUFFLENBQUM7QUFFM0IsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLDZCQUE2QixFQUFFLHVDQUF1QyxDQUFDLENBQUM7QUFDbkcsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLG1DQUFtQyxFQUFFLHFDQUFxQyxDQUFDLENBQUM7QUFDeEcsTUFBTSwwQkFBMEIsR0FBRyxDQUFDLCtCQUErQixFQUFFLGtDQUFrQyxFQUFFLG9DQUFvQyxDQUFDLENBQUM7QUFDL0ksTUFBTSxXQUFXLEdBQUcsQ0FBQyxzQ0FBc0MsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDO0FBRTlGOzs7R0FHRztBQUNILE1BQU0sYUFBYSxHQUFHLENBQUMsSUFBYyxFQUFFLEVBQUU7SUFDckMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3BCLE9BQU8sRUFBRSxDQUFDO0lBQ2QsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQzlCLENBQUMsQ0FBQztBQUVGLE1BQU0sYUFBYSxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7SUFDbkMsNkdBQTZHO0lBQzdHLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUM1QixDQUFDLENBQUM7QUFFRjs7OztHQUlHO0FBQ0gsTUFBTSxlQUFlLEdBQUcs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