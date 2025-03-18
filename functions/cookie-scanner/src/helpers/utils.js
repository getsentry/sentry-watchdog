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