import crypto from 'crypto';
import fs from 'fs';
import { join } from 'path';
<<<<<<<< HEAD:functions/cookie-scanner/src/utils.ts
import { getDomain } from 'tldts';
import { BlacklightEvent } from './types';
import { Browser } from 'puppeteer';

export const hasOwnProperty = (object: object, property: string) => {
========
import { BlacklightEvent } from '../types';

export const hasOwnProperty = (object:object, property:string) => {
>>>>>>>> upstream/main:src/helpers/utils.ts
    return Object.prototype.hasOwnProperty.call(object, property);
};

const deleteFolderRecursive = path => {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(file => {
            const curPath = path + '/' + file;
            if (fs.lstatSync(curPath).isDirectory()) {
                // recurse
                deleteFolderRecursive(curPath);
            } else {
                // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

// This is an annoying hack to get around an issue in Puppeteer
// where the browser.close method hangs indefinitely
// See https://github.com/Sparticuz/chromium/issues/85#issuecomment-1527692751
export const closeBrowser = async (browser: Browser) => {
    try {
        // First try to close all pages
        const pages = await browser.pages();
        await Promise.all(pages.map(async (page) => {
            try {
                await page.close({ runBeforeUnload: false });
            } catch (e) {
                // Ignore individual page close errors
            }
        }));

        // Then close the browser with a timeout
        const browserClosePromise = browser.close();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Browser close timeout')), 30000)
        );

        await Promise.race([browserClosePromise, timeoutPromise])
            .catch(async (error) => {
                // Log the error that caused the normal close to fail
                console.error('Browser close failed:', error);
                // If normal close fails, try force closing the browser process
                try {
                    browser.process()?.kill('SIGKILL');
                } catch (killError) {
                    // If even force kill fails, log it but don't throw
                    console.error('Failed to force kill browser:', killError);
                }
            });
    } catch (error) {
        // Log error but don't throw to ensure cleanup continues
        console.error('Error during browser cleanup:', error);
    }
};

export const clearDir = (outDir, mkNewDir = true) => {
    if (fs.existsSync(outDir)) {
        deleteFolderRecursive(outDir);
    }
    if (mkNewDir) {
        fs.mkdirSync(outDir);
    }
};

export const loadJSONSafely = (str:string) => {
    try {
        return JSON.parse(str);
    } catch (error) {
        console.log('couldnt load json safely', str);
        return { level: 'error' };
    }
};

export const groupBy = key => array =>
    array.reduce((objectsByKeyValue, obj) => {
        const value = obj[key];
        objectsByKeyValue[value] = (objectsByKeyValue[value] || []).concat(obj);
        return objectsByKeyValue;
    }, {});

export const serializeCanvasCallMap = inputMap => {
    const obj = {};

    inputMap.forEach((value, key) => {
        obj[key] = value instanceof Set ? Array.from(value) : value;
    });

    return obj;
};

// Go through the stack trace and get the first filename.
// If no fileName is found return the source of the last function in
// the trace
export const getScriptUrl = (item: BlacklightEvent) => {
    const { stack } = item;

    for (let i = 0; i < stack.length; i++) {
        if (hasOwnProperty(stack[i], 'fileName')) {
            return stack[i].fileName;
        } else {
            if (i === stack.length - 1) {
                return !!stack[i].source ? stack[i].source : '';
            }
        }
    }
};

export const loadEventData = (dir, filename = 'inspection-log.ndjson') => {
    return fs
        .readFileSync(join(dir, filename), 'utf-8')
        .split('\n')
        .filter(m => m)
        .map(m => loadJSONSafely(m))
        .filter(m => m.level === 'warn');
};

const getStringHash = (algorithm, str) => {
    return crypto.createHash(algorithm).update(str).digest('hex');
};

export const getHashedValues = (algorithm, object) => {
    return Object.entries(object).reduce((acc, cur: any) => {
        acc[cur[0]] = algorithm === 'base64' ? Buffer.from(cur[1]).toString('base64') : getStringHash(algorithm, cur[1]);
        return acc;
    }, {});
};
