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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxvREFBNEI7QUFDNUIsNENBQW9CO0FBQ3BCLCtCQUE0QjtBQUM1QixpQ0FBa0M7QUFJM0IsTUFBTSxjQUFjLEdBQUcsQ0FBQyxNQUFhLEVBQUUsUUFBZSxFQUFFLEVBQUU7SUFDN0QsT0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQ2xFLENBQUMsQ0FBQztBQUZXLFFBQUEsY0FBYyxrQkFFekI7QUFFRixNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxFQUFFO0lBQ2pDLElBQUksWUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNyQixZQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNoQyxNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQztZQUNsQyxJQUFJLFlBQUUsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFLEVBQUU7Z0JBQ3JDLFVBQVU7Z0JBQ1YscUJBQXFCLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDbEM7aUJBQU07Z0JBQ0gsY0FBYztnQkFDZCxZQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQzFCO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFDSCxZQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3RCO0FBQ0wsQ0FBQyxDQUFDO0FBRUYsK0RBQStEO0FBQy9ELG9EQUFvRDtBQUNwRCw4RUFBOEU7QUFDdkUsTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUFDLE9BQU8sRUFBQyxFQUFFO0lBQ3hDLGtDQUFrQztJQUNsQyxNQUFNLEtBQUssR0FBRyxNQUFNLE9BQU8s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