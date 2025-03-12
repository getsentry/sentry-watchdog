"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHashedValues = exports.getStringHash = exports.getStackType = exports.loadEventData = exports.getScriptUrl = exports.serializeCanvasCallMap = exports.groupBy = exports.loadJSONSafely = exports.clearDir = exports.closeBrowser = exports.hasOwnProperty = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = require("path");
const tldts_1 = require("tldts");
const hasOwnProperty = (object, property) => {
    return Object.prototype.hasOwnProperty.call(object, property);
};
exports.hasOwnProperty = hasOwnProperty;
const deleteFolderRecursive = path => {
    if (fs_1.default.existsSync(path)) {
        fs_1.default.readdirSync(path).forEach(file => {
            const curPath = path + '/' + file;
            if (fs_1.default.lstatSync(curPath).isDirectory()) {
                // recurse
                deleteFolderRecursive(curPath);
            }
            else {
                // delete file
                fs_1.default.unlinkSync(curPath);
            }
        });
        fs_1.default.rmdirSync(path);
    }
};
// This is an annoying hack to get around an issue in Puppeteer
// where the browser.close method hangs indefinitely
// See https://github.com/Sparticuz/chromium/issues/85#issuecomment-1527692751
const closeBrowser = async (browser) => {
    try {
        // First try to close all pages
        const pages = await browser.pages();
        await Promise.all(pages.map(async (page) => {
            try {
                await page.close({ runBeforeUnload: false });
            }
            catch (e) {
                // Ignore individual page close errors
            }
        }));
        // Then close the browser with a timeout
        const browserClosePromise = browser.close();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Browser close timeout')), 30000));
        await Promise.race([browserClosePromise, timeoutPromise])
            .catch(async (error) => {
            // Log the error that caused the normal close to fail
            console.error('Browser close failed:', error);
            // If normal close fails, try force closing the browser process
            try {
                browser.process()?.kill('SIGKILL');
            }
            catch (killError) {
                // If even force kill fails, log it but don't throw
                console.error('Failed to force kill browser:', killError);
            }
        });
    }
    catch (error) {
        // Log error but don't throw to ensure cleanup continues
        console.error('Error during browser cleanup:', error);
    }
};
exports.closeBrowser = closeBrowser;
const clearDir = (outDir, mkNewDir = true) => {
    if (fs_1.default.existsSync(outDir)) {
        deleteFolderRecursive(outDir);
    }
    if (mkNewDir) {
        fs_1.default.mkdirSync(outDir);
    }
};
exports.clearDir = clearDir;
const loadJSONSafely = str => {
    try {
        return JSON.parse(str);
    }
    catch (error) {
        console.log('couldnt load json safely', str);
        return { level: 'error' };
    }
};
exports.loadJSONSafely = loadJSONSafely;
const groupBy = key => array => array.reduce((objectsByKeyValue, obj) => {
    const value = obj[key];
    objectsByKeyValue[value] = (objectsByKeyValue[value] || []).concat(obj);
    return objectsByKeyValue;
}, {});
exports.groupBy = groupBy;
const serializeCanvasCallMap = inputMap => {
    const obj = {};
    inputMap.forEach((value, key) => {
        obj[key] = value instanceof Set ? Array.from(value) : value;
    });
    return obj;
};
exports.serializeCanvasCallMap = serializeCanvasCallMap;
// Go through the stack trace and get the first filename.
// If no fileName is found return the source of the last function in
// the trace
const getScriptUrl = (item) => {
    const { stack } = item;
    for (let i = 0; i < stack.length; i++) {
        if ((0, exports.hasOwnProperty)(stack[i], 'fileName')) {
            return stack[i].fileName;
        }
        else {
            if (i === stack.length - 1) {
                return !!stack[i].source ? stack[i].source : '';
            }
        }
    }
};
exports.getScriptUrl = getScriptUrl;
const loadEventData = (dir, filename = 'inspection-log.ndjson') => {
    return fs_1.default
        .readFileSync((0, path_1.join)(dir, filename), 'utf-8')
        .split('\n')
        .filter(m => m)
        .map(m => (0, exports.loadJSONSafely)(m))
        .filter(m => m.level === 'warn');
};
exports.loadEventData = loadEventData;
// Not using this atm but leaving it in because it might be useful in the future
const getStackType = (stack, firstPartyDomain) => {
    let hasFirstParty = false;
    let hasThirdParty = false;
    stack.forEach(s => {
        if ((0, exports.hasOwnProperty)(s, 'fileName')) {
            const scriptDomain = (0, tldts_1.getDomain)(s.fileName);
            if (scriptDomain === firstPartyDomain) {
                hasFirstParty = true;
            }
            else {
                hasThirdParty = true;
            }
        }
    });
    if (hasFirstParty && !hasThirdParty) {
        return 'first-party-only';
    }
    else if (hasThirdParty && !hasFirstParty) {
        return 'third-party-only';
    }
    else {
        return 'mixed';
    }
};
exports.getStackType = getStackType;
const getStringHash = (algorithm, str) => {
    return crypto_1.default.createHash(algorithm).update(str).digest('hex');
};
exports.getStringHash = getStringHash;
const getHashedValues = (algorithm, object) => {
    return Object.entries(object).reduce((acc, cur) => {
        acc[cur[0]] = algorithm === 'base64' ? Buffer.from(cur[1]).toString('base64') : (0, exports.getStringHash)(algorithm, cur[1]);
        return acc;
    }, {});
};
exports.getHashedValues = getHashedValues;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxvREFBNEI7QUFDNUIsNENBQW9CO0FBQ3BCLCtCQUE0QjtBQUM1QixpQ0FBa0M7QUFJM0IsTUFBTSxjQUFjLEdBQUcsQ0FBQyxNQUFjLEVBQUUsUUFBZ0IsRUFBRSxFQUFFO0lBQy9ELE9BQU8sTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztBQUNsRSxDQUFDLENBQUM7QUFGVyxRQUFBLGNBQWMsa0JBRXpCO0FBRUYsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsRUFBRTtJQUNqQyxJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDckIsWUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDaEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUM7WUFDbEMsSUFBSSxZQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFO2dCQUNyQyxVQUFVO2dCQUNWLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ2xDO2lCQUFNO2dCQUNILGNBQWM7Z0JBQ2QsWUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUMxQjtRQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ0gsWUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUN0QjtBQUNMLENBQUMsQ0FBQztBQUVGLCtEQUErRDtBQUMvRCxvREFBb0Q7QUFDcEQsOEVBQThFO0FBQ3ZFLE1BQU0sWUFBWSxHQUFHLEtBQUssRUFBRSxPQUFnQixFQUFFLEVBQUU7SUFDbkQsSUFBSTtRQUNBLCtCQUErQjtRQUMvQixNQUFNLEtBQUssR0FB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