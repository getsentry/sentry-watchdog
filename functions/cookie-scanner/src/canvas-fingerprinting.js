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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FudmFzLWZpbmdlcnByaW50aW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2FudmFzLWZpbmdlcnByaW50aW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUtBLDJDQUF1RTtBQUV2RSxNQUFNLHNCQUFzQixHQUFHLEVBQUUsQ0FBQztBQUNsQyxNQUFNLHVCQUF1QixHQUFHLEVBQUUsQ0FBQztBQUNuQyxNQUFNLGtCQUFrQixHQUFHLEVBQUUsQ0FBQztBQUM5QixNQUFNLHNCQUFzQixHQUFHLEVBQUUsQ0FBQztBQUNsQyxNQUFNLGVBQWUsR0FBRyxFQUFFLENBQUM7QUFFM0IsTUFBTSxpQkFBaUIsR0FBWSxDQUFDLDZCQUE2QixFQUFFLHVDQUF1QyxDQUFDLENBQUM7QUFDNUcsTUFBTSxrQkFBa0IsR0FBVyxDQUFDLG1DQUFtQyxFQUFFLHFDQUFxQyxDQUFDLENBQUM7QUFDaEgsTUFBTSwwQkFBMEIsR0FBRyxDQUFDLCtCQUErQixFQUFFLGtDQUFrQyxFQUFFLG9DQUFvQyxDQUFDLENBQUM7QUFDL0ksTUFBTSxXQUFXLEdBQWtCLENBQUMsc0NBQXNDLEVBQUUsK0JBQStCLENBQUMsQ0FBQztBQUU3Rzs7O0dBR0c7QUFDSCxNQUFNLGFBQWEsR0FBRyxDQUFDLElBQWMsRUFBRSxFQUFFO0lBQ3JDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDbkIsT0FBTyxFQUFFLENBQUM7S0FDYjtJQUNELE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQzlCLENBQUMsQ0FBQztBQUVGLE1BQU0sYUFBYSxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7SUFDbkMsNkdBQTZHO0lBQzdHLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUM1QixDQUFDLENBQUM7QUFFRjs7OztHQUlHO0FBQ0gsTUFBTSxlQUFlLEdBQUcsQ0FBQyxJQUFj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