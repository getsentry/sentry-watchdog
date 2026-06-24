"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHashedValues = exports.loadEventData = exports.getScriptUrl = exports.serializeCanvasCallMap = exports.groupBy = exports.loadJSONSafely = exports.clearDir = exports.closeBrowser = exports.urlToSafeFilename = exports.hasOwnProperty = exports.safePath = void 0;
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
const urlToSafeFilename = (url) => {
    const name = url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '_');
    let end = name.length;
    while (end > 0 && name[end - 1] === '_') {
        end--;
    }
    return name.slice(0, end);
};
exports.urlToSafeFilename = urlToSafeFilename;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxvREFBNEI7QUFDNUIsNENBQW9CO0FBQ3BCLCtCQUF5QztBQUlsQyxNQUFNLFFBQVEsR0FBRyxDQUFDLE9BQWUsRUFBRSxHQUFHLFFBQWtCLEVBQVUsRUFBRTtJQUN2RSxNQUFNLElBQUksR0FBRyxJQUFBLGNBQU8sRUFBQyxPQUFPLENBQUMsQ0FBQztJQUM5QixNQUFNLFFBQVEsR0FBRyxJQUFBLGNBQU8sRUFBQyxJQUFJLEVBQUUsR0FBRyxRQUFRLENBQUMsQ0FBQztJQUM1QyxNQUFNLEdBQUcsR0FBRyxJQUFBLGVBQVEsRUFBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDckMsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDN0MsTUFBTSxJQUFJLEtBQUssQ0FBQyw0QkFBNEIsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7S0FDckU7SUFDRCxPQUFPLFFBQVEsQ0FBQztBQUNwQixDQUFDLENBQUM7QUFSVyxRQUFBLFFBQVEsWUFRbkI7QUFFSyxNQUFNLGNBQWMsR0FBRyxDQUFDLE1BQWMsRUFBRSxRQUFnQixFQUFFLEVBQUU7SUFDL0QsT0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQ2xFLENBQUMsQ0FBQztBQUZXLFFBQUEsY0FBYyxrQkFFekI7QUFFSyxNQUFNLGlCQUFpQixHQUFHLENBQUMsR0FBVyxFQUFVLEVBQUU7SUFDckQsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsQ0FB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