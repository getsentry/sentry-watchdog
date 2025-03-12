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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
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
const axios_1 = __importDefault(require("axios"));
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
const LOG_DESTINATION = process.env.LOG_DESTINATION;
const LOG_FORWARDING_AUTH_TOKEN = process.env.LOG_FORWARDING_AUTH_TOKEN;
async function scanUrl(url, config) {
    const scannerConfig = {
        title: config?.title,
        headless: config?.scanner?.headless,
        numPages: config?.scanner?.numPages,
        captureHar: config?.scanner?.captureHar,
        saveScreenshots: config?.scanner?.saveScreenshots,
        emulateDevice: config?.scanner?.emulateDevice || {
            viewport: {
                width: 1280,
                height: 800
            },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
        },
        outDir: (0, path_1.join)(os.tmpdir(), config?.output?.outDir || 'out', url
            .replace(/^https?:\/\//, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+$/g, '')),
        reportDir: (0, path_1.join)(os.tmpdir(), config?.output?.reportDir || 'reports'),
        extraChromiumArgs: config?.scanner?.extraChromiumArgs || [
            '--disable-features=TrackingProtection3pcd'
        ],
        extraPuppeteerOptions: {
            protocolTimeout: 120000,
            timeout: 120000,
            ...config?.scanner?.extraPuppeteerOptions,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        }
    };
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    // console.log(`Beginning scan of ${url}`);
    const result = await (0, collector_1.collect)(formattedUrl, scannerConfig);
    if (result.status === 'success') {
        logForwarding({
            "status": "info",
            "message": `page scanned: ${url}`,
            "timestamp": new Date().toISOString(),
        });
    }
    else {
        logForwarding({
            "status": "info",
            "message": `page scanned: ${url}`,
            "timestamp": new Date().toISOString(),
        });
    }
}
// Forward logs to SIEM webhook
async function logForwarding(data) {
    if (LOG_DESTINATION && LOG_FORWARDING_AUTH_TOKEN) {
        const headers = {
            "Authorization": `Bearer ${LOG_FORWARDING_AUTH_TOKEN}`,
            "Content-Type": "application/json",
        };
        try {
            const response = await axios_1.default.post(LOG_DESTINATION, data, { headers, timeout: 10000 });
            if (response.status === 200 || response.status === 204) {
            }
            else {
                Sentry.captureException(response.data);
            }
        }
        catch (error) {
            Sentry.captureException(error);
        }
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
        console.log(`Successfully uploaded report to GCS: https://storage.cloud.google.com/${bucketName}/${folderName}${file_name}.json`);
    }
    catch (error) {
        Sentry.captureException(error);
        throw error;
    }
}
exports.main = functions.http('main', async (rawMessage, res) => {
    const startTime = Date.now();
    const failedPages = [];
    try {
        // Decode message
        const data = rawMessage.body.message.data ? Buffer.from(rawMessage.body.message.data, 'base64').toString() : '{}';
        const parsedData = JSON.parse(data);
        console.log("--------------------------------");
        console.log(parsedData.title, " chunk_no: ", parsedData.chunk_no, " of ", parsedData.total_chunks);
        console.log("--------------------------------");
        logForwarding({
            "status": "info",
            "message": "scanner started",
            "timestamp": new Date().toISOString(),
            "data": {
                "chunk_no": parsedData.chunk_no,
                "total_chunks": parsedData.total_chunks,
                "total_pages": parsedData.total_pages
            }
        });
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
        const job_id = `[${parsedData.chunk_no}/${parsedData.total_chunks}]`;
        let pagesToScan = parsedData.target;
        let running = 0;
        const queue = [...pagesToScan];
        const scanPromises = []; // Track all scan promises
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
                // Create promise for each scan and track it
                const scanPromise = (async () => {
                    try {
                        await scanUrl(page, customConfig);
                    }
                    catch (error) {
                        // Sentry.captureMessage(`First scan attempt failed for ${page}:`, error);
                        logForwarding({
                            "status": "info",
                            "message": `${job_id} First scan failed for ${page}`,
                            "timestamp": new Date().toISOString(),
                        });
                        // if failed, try again
                        try {
                            console.log(`${job_id} Attempting retry scan for: ${page}`);
                            await scanUrl(page, customConfig);
                        }
                        catch (retryError) {
                            Sentry.captureException(`Retry scan failed for ${page}:`, retryError);
                            console.error(`${job_id} Retry scan failed for ${page}:`, retryError);
                            logForwarding({
                                "status": "info",
                                "message": `Retry scan failed for ${page}`,
                                "timestamp": new Date().toISOString(),
                            });
                            failedPages.push(page);
                        }
                    }
                    finally {
                        running--;
                    }
                })();
                scanPromises.push(scanPromise);
                processNext(); // Continue processing next items
            }
        }
        // Start the processing
        await processNext();
        // Wait for ALL scan promises to complete
        await Promise.allSettled(scanPromises);
        console.log(`${job_id} All scans completed, generating aggregate report`);
        const aggregatedReport = await (0, aggregateReports_1.aggregateReports)(customConfig);
        const result = { metadata, result: aggregatedReport };
        await uploadReportToGCS(parsedData.chunk_no, JSON.stringify(result), bucketName, folderName);
        logForwarding({
            "status": "info",
            "message": "chunk scan completed",
            "timestamp": new Date().toISOString(),
            "data": {
                "chunk_no": parsedData.chunk_no,
                "total_chunks": parsedData.total_chunks,
                "report_url": `https://storage.googleapis.com/${bucketName}/${folderName}${parsedData.chunk_no}.json`,
                "time_spent": `${((Date.now() - startTime) / 1000).toFixed(2)}s`
            }
        });
        if (failedPages.length > 0) {
            logForwarding({
                "status": "error",
                "message": "failed pages",
                "timestamp": new Date().toISOString(),
                "data": {
                    "job_id": job_id,
                    "failed_pages": failedPages
                }
            });
        }
        // Explicitly ACK by returning 200
        res.status(200).json({
            success: true,
            messageId: rawMessage.body.message.messageId,
            report: aggregatedReport
        });
    }
    catch (error) {
        // Explicitly NACK by returning 500
        logForwarding({
            "status": "error",
            "message": "scanner failed",
            "timestamp": new Date().toISOString(),
            "data": error.message
        });
        Sentry.captureException(error);
        res.status(500).json({
            success: false,
            messageId: rawMessage.body.message.messageId,
            error: error.message,
            stack: error.stack
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZFQUErRDtBQUMvRCxtREFBZ0Q7QUFDaEQsK0JBQTRCO0FBQzVCLDJDQUF3RDtBQUN4RCx5REFBc0Q7QUFFdEQsdUNBQXlCO0FBQ3pCLHVDQUF5QjtBQUN6QixrREFBMEI7QUFFMUIscURBQXVDO0FBRXZDLHlDQUF3RDtBQUEvQyxvR0FBQSxPQUFPLE9BQUE7QUFDaEIsdURBQXNEO0FBQTdDLG9IQUFBLGdCQUFnQixPQUFBO0FBRXpCLDhCQUE4QjtBQUM5QixJQUFJO0FBQ0osd0NBQXdDO0FBQ3hDLG1CQUFtQjtBQUNuQiw0QkFBNEI7QUFDNUIseUJBQXlCO0FBQ3pCLCtCQUErQjtBQUMvQixvQ0FBb0M7QUFDcEMsNkJBQTZCO0FBQzdCLDRCQUE0QjtBQUM1QixrQ0FBa0M7QUFDbEMsZ0NBQWdDO0FBQ2hDLGlCQUFpQjtBQUNqQiw0SUFBNEk7QUFDNUksWUFBWTtBQUNaLFNBQVM7QUFDVCwyQkFBMkI7QUFDM0Isd0JBQXdCO0FBQ3hCLDJCQUEyQjtBQUMzQix5QkFBeUI7QUFDekIscUJBQXFCO0FBQ3JCLGtCQUFrQjtBQUNsQiwrQkFBK0I7QUFDL0IsK0JBQStCO0FBQy9CLCtCQUErQjtBQUMvQiwrQkFBK0I7QUFDL0IsY0FBYztBQUNkLFFBQVE7QUFDUixJQUFJO0FBRUosTUFBTSxDQUFDLElBQUksQ0FBQztJQUNSLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVU7SUFDM0IsZ0JBQWdCLEVBQUUsR0FBRztJQUNyQixXQUFXLEVBQUUsZ0JBQWdCO0NBQ2hDLENBQUMsQ0FBQztBQUVILE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDO0FBQ3BELE1BQU0seUJBQXlCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FB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