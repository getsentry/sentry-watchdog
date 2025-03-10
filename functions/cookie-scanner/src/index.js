"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = exports.aggregateReports = exports.collect = void 0;
const functions = __importStar(require("@google-cloud/functions-framework"));
const path_1 = require("path");
const collector_1 = require("./collector");
const aggregateReports_1 = require("./aggregateReports");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const Sentry = __importStar(require("@sentry/node"));
var collector_2 = require("./collector");
Object.defineProperty(exports, "collect", { enumerable: true, get: function () { return collector_2.collect; } });
var aggregateReports_2 = require("./aggregateReports");
Object.defineProperty(exports, "aggregateReports", { enumerable: true, get: function () { return aggregateReports_2.aggregateReports; } });
// message format from pubsub:
// {
//     "title": "Sentry Cookie Scanner",
//     "scanner": {
//         "headless": true,
//         "numPages": 0,
//         "captureHar": false,
//         "saveScreenshots": false,
//         "emulateDevice": {
//             "viewport": {
//                 "height": 1920,
//                 "width": 1080
//             },
//             "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.3"
//         }
//     },
//     "maxConcurrent": 30,
//     "chunkSize": 500,
//     "total_pages": 3275,
//     "total_chunks": 7,
//     "chunk_no": 1,
//     "target": [
//         "https://page1.com",
//         "https://page2.com",
//         "https://page3.com",
//         "https://page4.com",
//         ...
//     ]
// }
Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
});
async function scanUrl(url, customConfig) {
    const defaultConfig = {
        title: customConfig?.title,
        headless: customConfig?.headless,
        numPages: customConfig?.numPages,
        captureHar: customConfig?.captureHar,
        saveScreenshots: customConfig?.saveScreenshots,
        emulateDevice: {
            viewport: {
                width: 1280,
                height: 800
            },
            userAgent: customConfig?.emulateDevice?.userAgent ||
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
        },
        outDir: (0, path_1.join)(os.tmpdir(), customConfig?.outDir || 'out', url
            .replace(/^https?:\/\//, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+$/g, '')),
        reportDir: (0, path_1.join)(os.tmpdir(), customConfig?.reportDir || 'reports'),
        extraPuppeteerOptions: {
            protocolTimeout: 120000,
            timeout: 120000,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        }
    };
    const config = { ...defaultConfig, ...customConfig };
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    // console.log(`Beginning scan of ${url}`);
    const result = await (0, collector_1.collect)(formattedUrl, config);
    if (result.status === 'success') {
        console.log(`Scan successful: ${config.outDir}`);
    }
    else {
        console.error(`Scan failed: ${result.page_response}`);
    }
}
exports.main = functions.http('main', async (rawMessage, res) => {
    try {
        // Decode message
        const data = rawMessage.body.message.data ? Buffer.from(rawMessage.body.message.data, 'base64').toString() : '{}';
        const parsedData = JSON.parse(data);
        console.log("--------------------------------");
        console.log(parsedData.title, " chunk_no: ", parsedData.chunk_no, " of ", parsedData.total_chunks);
        console.log("--------------------------------");
        const { title, scanner, target, maxConcurrent } = parsedData;
        const customConfig = {
            title,
            scanner,
            target,
            maxConcurrent,
            output: {
                outDir: 'out',
                reportDir: 'reports'
            }
        };
        let pagesToScan = parsedData.target;
        let running = 0;
        const queue = [...pagesToScan];
        try {
            if (!fs.existsSync((0, path_1.join)(os.tmpdir(), customConfig.output.outDir))) {
                fs.mkdirSync((0, path_1.join)(os.tmpdir(), customConfig.output.outDir), { recursive: true });
            }
            if (!fs.existsSync((0, path_1.join)(os.tmpdir(), customConfig.output.reportDir))) {
                fs.mkdirSync((0, path_1.join)(os.tmpdir(), customConfig.output.reportDir), { recursive: true });
            }
        }
        catch (dirError) {
            console.error('Error creating directories:', dirError);
            Sentry.captureException(dirError);
            throw dirError;
        }
        async function processNext() {
            while (queue.length > 0 && running < maxConcurrent) {
                const page = queue.shift();
                running++;
                // Use immediately invoked async function to handle each scan
                (async () => {
                    try {
                        console.log(`Attempting first scan for: ${page}`);
                        await scanUrl(page, customConfig);
                    }
                    catch (error) {
                        Sentry.captureException(`First scan attempt failed for ${page}:`, error);
                        console.log(`First scan attempt failed for ${page}:`, error);
                        // if failed, try again
                        try {
                            console.log(`Attempting retry scan for: ${page}`);
                            await scanUrl(page, customConfig);
                        }
                        catch (retryError) {
                            Sentry.captureException(`Retry scan failed for ${page}:`, retryError);
                            console.error(`Retry scan failed for ${page}:`, retryError);
                        }
                    }
                    finally {
                        running--;
                        console.log(`Completed processing for: ${page}. Running count: ${running}`);
                        processNext();
                    }
                })();
            }
        }
        // Start the processing
        await processNext();
        // Wait until all scans are complete
        while (running > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('All scans completed, generating aggregate report');
        const aggregatedReport = await (0, aggregateReports_1.aggregateReports)(customConfig);
        console.log('Successfully generated aggregate report:', aggregatedReport);
        res.status(200).json({
            success: true,
            report: aggregatedReport
        });
    }
    catch (error) {
        console.error('Error in main function:', error);
        Sentry.captureException(error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZFQUErRDtBQUMvRCwrQkFBNEI7QUFDNUIsMkNBQXdEO0FBQ3hELHlEQUFzRDtBQUV0RCx1Q0FBeUI7QUFDekIsdUNBQXlCO0FBRXpCLHFEQUF1QztBQUV2Qyx5Q0FBd0Q7QUFBL0Msb0dBQUEsT0FBTyxPQUFBO0FBQ2hCLHVEQUFzRDtBQUE3QyxvSEFBQSxnQkFBZ0IsT0FBQTtBQUV6Qiw4QkFBOEI7QUFDOUIsSUFBSTtBQUNKLHdDQUF3QztBQUN4QyxtQkFBbUI7QUFDbkIsNEJBQTRCO0FBQzVCLHlCQUF5QjtBQUN6QiwrQkFBK0I7QUFDL0Isb0NBQW9DO0FBQ3BDLDZCQUE2QjtBQUM3Qiw0QkFBNEI7QUFDNUIsa0NBQWtDO0FBQ2xDLGdDQUFnQztBQUNoQyxpQkFBaUI7QUFDakIsNElBQTRJO0FBQzVJLFlBQVk7QUFDWixTQUFTO0FBQ1QsMkJBQTJCO0FBQzNCLHdCQUF3QjtBQUN4QiwyQkFBMkI7QUFDM0IseUJBQXlCO0FBQ3pCLHFCQUFxQjtBQUNyQixrQkFBa0I7QUFDbEIsK0JBQStCO0FBQy9CLCtCQUErQjtBQUMvQiwrQkFBK0I7QUFDL0IsK0JBQStCO0FBQy9CLGNBQWM7QUFDZCxRQUFRO0FBQ1IsSUFBSTtBQUVKLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDUixHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVO0lBQzNCLGdCQUFnQixFQUFFLEdBQUc7Q0FDeEIsQ0FBQyxDQUFDO0FBRUgsS0FBSyxVQUFVLE9BQU8sQ0FBQyxHQUFXLEVBQUUsWUFBd0M7SUFDeEUsTUFBTSxhQUFhLEdBQXFCO1FBQ3BDLEtBQUssRUFBRSxZQUFZLEVBQUUsS0FBSztRQUMxQixRQUFRLEVBQUUsWUFBWSxFQUFFLFFBQVE7UUFDaEMsUUFBUSxFQUFFLFlBQVksRUFBRSxRQUFR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