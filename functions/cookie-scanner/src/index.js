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
const storage_1 = require("@google-cloud/storage");
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
    environment: "cookie-scanner",
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
const bucketName = process.env.AGGREGATE_REPORTS_BUCKET;
const today = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // Format: YYYYMMDD
const folderName = `${today}/`; // Folder with today's date
async function uploadReportToGCS(file_name, report, bucketName, folderName) {
    const storage = new storage_1.Storage();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(`${folderName}${file_name}.json`);
    try {
        await file.save(report, {
            public: false,
            metadata: {
                contentType: 'application/json'
            }
        });
        console.log(`Successfully uploaded report to GCS: ${file_name}`);
    }
    catch (error) {
        console.error('Error uploading report to GCS:', error);
        Sentry.captureException(error);
        throw error;
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
        const metadata = {
            title: parsedData.title,
            date: folderName,
            chunk_no: parsedData.chunk_no,
            total_chunks: parsedData.total_chunks,
            total_pages: parsedData.total_pages
        };
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
        const result = { metadata, result: aggregatedReport };
        console.log('Successfully generated aggregate report:', result);
        await uploadReportToGCS(parsedData.chunk_no, JSON.stringify(result), bucketName, folderName);
        console.log('Successfully uploaded aggregate report to GCS');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZFQUErRDtBQUMvRCxtREFBZ0Q7QUFDaEQsK0JBQTRCO0FBQzVCLDJDQUF3RDtBQUN4RCx5REFBc0Q7QUFFdEQsdUNBQXlCO0FBQ3pCLHVDQUF5QjtBQUV6QixxREFBdUM7QUFFdkMseUNBQXdEO0FBQS9DLG9HQUFBLE9BQU8sT0FBQTtBQUNoQix1REFBc0Q7QUFBN0Msb0hBQUEsZ0JBQWdCLE9BQUE7QUFFekIsOEJBQThCO0FBQzlCLElBQUk7QUFDSix3Q0FBd0M7QUFDeEMsbUJBQW1CO0FBQ25CLDRCQUE0QjtBQUM1Qix5QkFBeUI7QUFDekIsK0JBQStCO0FBQy9CLG9DQUFvQztBQUNwQyw2QkFBNkI7QUFDN0IsNEJBQTRCO0FBQzVCLGtDQUFrQztBQUNsQyxnQ0FBZ0M7QUFDaEMsaUJBQWlCO0FBQ2pCLDRJQUE0STtBQUM1SSxZQUFZO0FBQ1osU0FBUztBQUNULDJCQUEyQjtBQUMzQix3QkFBd0I7QUFDeEIsMkJBQTJCO0FBQzNCLHlCQUF5QjtBQUN6QixxQkFBcUI7QUFDckIsa0JBQWtCO0FBQ2xCLCtCQUErQjtBQUMvQiwrQkFBK0I7QUFDL0IsK0JBQStCO0FBQy9CLCtCQUErQjtBQUMvQixjQUFjO0FBQ2QsUUFBUTtBQUNSLElBQUk7QUFFSixNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ1IsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVTtJQUMzQixnQkFBZ0IsRUFBRSxHQUFHO0lBQ3JCLFdBQVcsRUFBRSxnQkFBZ0I7Q0FDaEMsQ0FBQyxDQUFDO0FBRUgsS0FBSyxVQUFVLE9BQU8sQ0FBQyxHQUFXLEVBQUUsWUFBd0M7SUFDeEUsTUFBTSxhQUFhLEdBQXFCO1FBQ3BDLEtBQUssRUFBRSxZQUFZLEVBQUUsS0FBSztRQUMxQixRQUFRLEVBQUUsWUFBWSxFQUFF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