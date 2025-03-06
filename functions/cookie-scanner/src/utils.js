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
    // console.log('closing browser');
    const pages = await browser.pages();
    for (let i = 0; i < pages.length; i++) {
        await pages[i].close();
    }
    const childProcess = browser.process();
    if (childProcess) {
        childProcess.kill(9);
    }
    await browser.close();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxvREFBNEI7QUFDNUIsNENBQW9CO0FBQ3BCLCtCQUE0QjtBQUM1QixpQ0FBa0M7QUFHM0IsTUFBTSxjQUFjLEdBQUcsQ0FBQyxNQUFjLEVBQUUsUUFBZ0IsRUFBRSxFQUFFO0lBQy9ELE9BQU8sTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztBQUNsRSxDQUFDLENBQUM7QUFGVyxRQUFBLGNBQWMsa0JBRXpCO0FBRUYsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsRUFBRTtJQUNqQyxJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDckIsWUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDaEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUM7WUFDbEMsSUFBSSxZQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFO2dCQUNyQyxVQUFVO2dCQUNWLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ2xDO2lCQUFNO2dCQUNILGNBQWM7Z0JBQ2QsWUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUMxQjtRQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ0gsWUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUN0QjtBQUNMLENBQUMsQ0FBQztBQUVGLCtEQUErRDtBQUMvRCxvREFBb0Q7QUFDcEQsOEVBQThFO0FBQ3ZFLE1BQU0sWUFBWSxHQUFHLEtBQUssRUFBQyxPQUFPLEVBQUMsRUFBRTtJQUN4QyxrQ0FBa0M7SUFDbEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxPQUFP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