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
        // These are too noisy for logs, disable for now
        // logForwarding({
        //     "status": "info",
        //     "message": `page scanned successfully`,
        //     "timestamp": getRFC3339Date(),
        //     "data": {
        //         "page_url": `${url}`
        //     }
        // })
    }
    else {
        // These are too noisy for logs, disable for now
        // logForwarding({
        //     "status": "info",
        //     "message": `page scanned successfully`,
        //     "timestamp": getRFC3339Date(),
        //     "data": {
        //         "page_url": `${url}`
        //     }
        // })
    }
}
function getRFC3339Date() {
    const date = new Date().toISOString();
    ; // "2024-03-18T12:34:56.789Z"
    // Convert "Z" to "+00:00" for strict RFC 3339 compliance
    return date.replace("Z", "+00:00");
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
const today = getRFC3339Date().slice(0, 10).replace(/-/g, ""); // Format: YYYYMMDD
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
        // Decode message and get necessary PubSub details
        const message = rawMessage.body.message;
        const data = message.data ? Buffer.from(message.data, 'base64').toString() : '{}';
        const parsedData = JSON.parse(data);
        const job_id = `${today}[${parsedData.chunk_no}/${parsedData.total_chunks}]`;
        console.log("--------------------------------");
        console.log(parsedData.title, " chunk_no: ", parsedData.chunk_no, " of ", parsedData.total_chunks);
        console.log("--------------------------------");
        logForwarding({
            "status": "info",
            "message": "scanner started",
            "timestamp": getRFC3339Date(),
            "data": {
                "job_id": job_id,
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
                        //     "message": `First scan failed`,
                        //     "timestamp": getRFC3339Date(),
                        //     "data": {
                        //         "job_id": job_id,
                        //         "page_url": `${page}`
                        //     }
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
                                "message": `Retry scan failed`,
                                "timestamp": getRFC3339Date(),
                                "data": {
                                    "job_id": job_id,
                                    "page_url": `${page}`
                                }
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
            "timestamp": getRFC3339Date(),
            "data": {
                "job_id": job_id,
                "report_url": `https://storage.googleapis.com/${bucketName}/${folderName}${parsedData.chunk_no}.json`,
                "time_spent": `${((Date.now() - startTime) / 1000).toFixed(2)}s`
            }
        });
        if (failedPages.length > 0) {
            logForwarding({
                "status": "error",
                "message": "failed pages",
                "timestamp": getRFC3339Date(),
                "data": {
                    "job_id": job_id,
                    "failed_pages": failedPages
                }
            });
        }
        res.status(200).json({
            success: true,
            messageId: message.messageId,
            report: aggregatedReport
        });
    }
    catch (error) {
        // Explicitly ACK by returning 500
        logForwarding({
            "status": "error",
            "message": "scanner failed",
            "timestamp": getRFC3339Date(),
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