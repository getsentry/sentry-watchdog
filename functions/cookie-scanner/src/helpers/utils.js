"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHashedValues = exports.loadEventData = exports.getScriptUrl = exports.serializeCanvasCallMap = exports.groupBy = exports.loadJSONSafely = exports.clearDir = exports.closeBrowser = exports.hasOwnProperty = exports.safePath = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = require("path");
const safePath = (baseDir, ...segments) => {
    const base = (0, path_1.resolve)(baseDir);
    const resolved = (0, path_1.resolve)(base, ...segments);
    const rel = (0, path_1.relative)(base, resolved);
    if (rel.startsWith('..') || rel.startsWith('/')) {
        throw new Error(`Path traversal detected: ${segments.join('/')}`);
    }
    return resolved;
};
exports.safePath = safePath;
const hasOwnProperty = (object, property) => {
    return Object.prototype.hasOwnProperty.call(object, property);
};
exports.hasOwnProperty = hasOwnProperty;
const deleteFolderRecursive = (dirPath) => {
    const baseDir = (0, path_1.resolve)(dirPath);
    if (fs_1.default.existsSync(baseDir)) {
        fs_1.default.readdirSync(baseDir).forEach(file => {
            const curPath = (0, exports.safePath)(baseDir, file);
            if (fs_1.default.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            }
            else {
                fs_1.default.unlinkSync(curPath);
            }
        });
        fs_1.default.rmdirSync(baseDir);
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
        const browserClosePromise = (async () => {
            try {
                await browser.disconnect();
                await browser.close();
            }
            catch (e) {
                throw e;
            }
        })();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Browser close timeout')), 30000));
        await Promise.race([browserClosePromise, timeoutPromise]).catch(async (error) => {
            // Log the error that caused the normal close to fail
            console.error('Browser close failed:', error);
            // If normal close fails, try force closing the browser process
            try {
                // Force kill the browser process
                const process = browser.process();
                if (process) {
                    process.kill('SIGKILL');
                }
            }
            catch (killError) {
                // If even force kill fails, log it but don't throw
                console.error('Failed to force kill browser:', killError);
            }
        });
    }
    catch (error) {
        console.error('Error during browser cleanup:', error);
    }
};
exports.closeBrowser = closeBrowser;
const clearDir = (outDir, mkNewDir = true) => {
    const resolved = (0, path_1.resolve)(outDir);
    if (fs_1.default.existsSync(resolved)) {
        deleteFolderRecursive(resolved);
    }
    if (mkNewDir) {
        fs_1.default.mkdirSync(resolved);
    }
};
exports.clearDir = clearDir;
const loadJSONSafely = (str) => {
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
        .readFileSync((0, exports.safePath)(dir, filename), 'utf-8')
        .split('\n')
        .filter(m => m)
        .map(m => (0, exports.loadJSONSafely)(m))
        .filter(m => m.level === 'warn');
};
exports.loadEventData = loadEventData;
const getStringHash = (algorithm, str) => {
    return crypto_1.default.createHash(algorithm).update(str).digest('hex');
};
const getHashedValues = (algorithm, object) => {
    return Object.entries(object).reduce((acc, cur) => {
        acc[cur[0]] = algorithm === 'base64' ? Buffer.from(cur[1]).toString('base64') : getStringHash(algorithm, cur[1]);
        return acc;
    }, {});
};
exports.getHashedValues = getHashedValues;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxvREFBNEI7QUFDNUIsNENBQW9CO0FBQ3BCLCtCQUF5QztBQUlsQyxNQUFNLFFBQVEsR0FBRyxDQUFDLE9BQWUsRUFBRSxHQUFHLFFBQWtCLEVBQVUsRUFBRTtJQUN2RSxNQUFNLElBQUksR0FBRyxJQUFBLGNBQU8sRUFBQyxPQUFPLENBQUMsQ0FBQztJQUM5QixNQUFNLFFBQVEsR0FBRyxJQUFBLGNBQU8sRUFBQyxJQUFJLEVBQUUsR0FBRyxRQUFRLENBQUMsQ0FBQztJQUM1QyxNQUFNLEdBQUcsR0FBRyxJQUFBLGVBQVEsRUFBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDckMsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUM5QyxNQUFNLElBQUksS0FBSyxDQUFDLDRCQUE0QixRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBQ0QsT0FBTyxRQUFRLENBQUM7QUFDcEIsQ0FBQyxDQUFDO0FBUlcsUUFBQSxRQUFRLFlBUW5CO0FBRUssTUFBTSxjQUFjLEdBQUcsQ0FBQyxNQUFjLEVBQUUsUUFBZ0IsRUFBRSxFQUFFO0lBQy9ELE9BQU8sTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztBQUNsRSxDQUFDLENBQUM7QUFGVyxRQUFBLGNBQWMsa0JBRXpCO0FBRUYsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLE9BQWUsRUFBRSxFQUFFO0lBQzlDLE1BQU0sT0FBTyxHQUFHLElBQUEsY0FBTyxFQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2pDLElBQUksWUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENB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