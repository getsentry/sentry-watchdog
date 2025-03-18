"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHashedValues = exports.loadEventData = exports.getScriptUrl = exports.serializeCanvasCallMap = exports.groupBy = exports.loadJSONSafely = exports.clearDir = exports.closeBrowser = exports.hasOwnProperty = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = require("path");
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
        await Promise.race([browserClosePromise, timeoutPromise])
            .catch(async (error) => {
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
    if (fs_1.default.existsSync(outDir)) {
        deleteFolderRecursive(outDir);
    }
    if (mkNewDir) {
        fs_1.default.mkdirSync(outDir);
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
        .readFileSync((0, path_1.join)(dir, filename), 'utf-8')
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxvREFBNEI7QUFDNUIsNENBQW9CO0FBQ3BCLCtCQUE0QjtBQUlyQixNQUFNLGNBQWMsR0FBRyxDQUFDLE1BQWEsRUFBRSxRQUFlLEVBQUUsRUFBRTtJQUM3RCxPQUFPLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDbEUsQ0FBQyxDQUFDO0FBRlcsUUFBQSxjQUFjLGtCQUV6QjtBQUVGLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxDQUFDLEVBQUU7SUFDakMsSUFBSSxZQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ3JCLFlBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2hDLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDO1lBQ2xDLElBQUksWUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRTtnQkFDckMsVUFBVTtnQkFDVixxQkFBcUIsQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUNsQztpQkFBTTtnQkFDSCxjQUFjO2dCQUNkLFlBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDMUI7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUNILFlBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDdEI7QUFDTCxDQUFDLENBQUM7QUFFRiwrREFBK0Q7QUFDL0Qsb0RBQW9EO0FBQ3BELDhFQUE4RTtBQUN2RSxNQUFNLFlBQVksR0FBRyxLQUFLLEVBQUUsT0FBZ0IsRUFBRSxFQUFFO0lBQ25ELElBQUk7UUFDQSwrQkFBK0I7UUFDL0IsTUFBTSxLQUFLLEdBQUcsTUFBTSxPQUFPLENB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