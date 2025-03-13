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
        // These are too noise for logs, disable for now
        // logForwarding({
        //     "status": "info",
        //     "message": `page scanned: ${url}`,
        //     "timestamp": new Date().toISOString(),
        // })
    }
    else {
        // These are too noise for logs, disable for now
        // logForwarding({
        //     "status": "info",
        //     "message": `page scanned: ${url}`,
        //     "timestamp": new Date().toISOString(),
        // })
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
    // Add deadline extension functionality
    let isProcessing = true;
    const extendDeadline = async () => {
        while (isProcessing) {
            try {
                // Extend deadline every 8 minutes (480000ms)
                // We do this before the 10-minute ACK deadline to ensure we don't miss it
                await new Promise(resolve => setTimeout(resolve, 480000));
                if (isProcessing) {
                    // If still processing, extend deadline by sending a 102 Processing status
                    res.writeProcessing();
                }
            }
            catch (error) {
                Sentry.captureException(error);
            }
        }
    };
    try {
        // Start deadline extension in the background
        extendDeadline();
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
                        // These are too noise for logs, disable for now
                        // Sentry.captureMessage(`First scan attempt failed for ${page}:`, error);
                        // logForwarding({
                        //     "status": "info",
                        //     "message": `${job_id} First scan failed for ${page}`,
                        //     "timestamp": new Date().toISOString(),
                        // });
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
        // Stop the deadline extension
        isProcessing = false;
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
        // Stop the deadline extension
        isProcessing = false;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZFQUErRDtBQUMvRCxtREFBZ0Q7QUFDaEQsK0JBQTRCO0FBQzVCLDJDQUF3RDtBQUN4RCx5REFBc0Q7QUFFdEQsdUNBQXlCO0FBQ3pCLHVDQUF5QjtBQUN6QixrREFBMEI7QUFFMUIscURBQXVDO0FBRXZDLHlDQUF3RDtBQUEvQyxvR0FBQSxPQUFPLE9BQUE7QUFDaEIsdURBQXNEO0FBQTdDLG9IQUFBLGdCQUFnQixPQUFBO0FBRXpCLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDUixHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVO0lBQzNCLGdCQUFnQixFQUFFLEdBQUc7SUFDckIsV0FBVyxFQUFFLGdCQUFnQjtDQUNoQyxDQUFDLENBQUM7QUFFSCxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQztBQUNwRCxNQUFNLHlCQUF5QixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUM7QUFFeEUsS0FBSyxVQUFVLE9BQU8sQ0FBQyxHQUFXLEVBQUUsTUFBcUI7SUFDckQsTUFBTSxhQUFhLEdBQXFCO1FBQ3BDLEtBQUssRUFBRSxNQUFNLEVBQUUsS0FBSztRQUNwQixRQUFRLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRO1FBQ25DLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVE7UUFDbkMsVUFBVSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsVUFBVTtRQUN2QyxlQUFlLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxlQUFlO1FBQ2pELGFBQWEsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsSUFBSTtZQUM3QyxRQUFRLEVBQUU7Z0JBQ04sS0FBSyxFQUFFLElBQUk7Z0JBQ1gsTUFBTSxFQUFF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