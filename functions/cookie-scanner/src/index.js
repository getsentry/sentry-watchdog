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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const Sentry = __importStar(require("@sentry/google-cloud-serverless"));
var collector_2 = require("./collector");
Object.defineProperty(exports, "collect", { enumerable: true, get: function () { return collector_2.collect; } });
var aggregateReports_2 = require("./aggregateReports");
Object.defineProperty(exports, "aggregateReports", { enumerable: true, get: function () { return aggregateReports_2.aggregateReports; } });
Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    environment: 'cookie-scanner'
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
        extraChromiumArgs: config?.scanner?.extraChromiumArgs || ['--disable-features=TrackingProtection3pcd'],
        extraPuppeteerOptions: {
            protocolTimeout: 120000,
            timeout: 120000,
            ...config?.scanner?.extraPuppeteerOptions,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--disable-gpu']
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
    const date = new Date().toISOString(); // "2024-03-18T12:34:56.789Z"
    // Convert "Z" to "+00:00" for strict RFC 3339 compliance
    return date.replace('Z', '+00:00');
}
// Forward logs to SIEM webhook
async function logForwarding(data) {
    if (LOG_DESTINATION && LOG_FORWARDING_AUTH_TOKEN) {
        const headers = {
            Authorization: `Bearer ${LOG_FORWARDING_AUTH_TOKEN}`,
            'Content-Type': 'application/json'
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
const today = getRFC3339Date().slice(0, 10).replace(/-/g, ''); // Format: YYYYMMDD
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
        console.log('--------------------------------');
        console.log(parsedData.title, ' chunk_no: ', parsedData.chunk_no, ' of ', parsedData.total_chunks);
        console.log('--------------------------------');
        logForwarding({
            status: 'info',
            message: 'scanner started',
            timestamp: getRFC3339Date(),
            data: {
                job_id: job_id,
                total_pages: parsedData.total_pages
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
                        // failure are usually due to network issues, so try again
                        try {
                            console.log(`${job_id} Attempting retry scan for: ${page}`);
                            await scanUrl(page, customConfig);
                        }
                        catch (retryError) {
                            Sentry.captureException(`Retry scan failed for ${page}:`, retryError);
                            console.error(`${job_id} Retry scan failed for ${page}:`, retryError);
                            logForwarding({
                                status: 'info',
                                message: `Retry scan failed`,
                                timestamp: getRFC3339Date(),
                                data: {
                                    job_id: job_id,
                                    page_url: `${page}`
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
        const report = {
            metadata: metadata,
            result: aggregatedReport,
            // only add failed_pages if there are any
            ...(failedPages.length > 0 && { failed_pages: failedPages })
        };
        await uploadReportToGCS(parsedData.chunk_no, JSON.stringify(report), bucketName, folderName);
        logForwarding({
            status: 'info',
            message: 'chunk scan completed',
            timestamp: getRFC3339Date(),
            data: {
                job_id: job_id,
                report_url: `https://storage.googleapis.com/${bucketName}/${folderName}${parsedData.chunk_no}.json`,
                time_spent: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
            }
        });
        res.status(200).json({
            success: true,
            messageId: message.messageId,
            report: aggregatedReport
        });
    }
    catch (error) {
        // Explicitly ACK by returning 500
        logForwarding({
            status: 'error',
            message: 'scanner failed',
            timestamp: getRFC3339Date(),
            data: error.message
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2RUFBK0Q7QUFDL0QsbURBQWdEO0FBQ2hELCtCQUE0QjtBQUM1QiwyQ0FBd0Q7QUFDeEQseURBQXNEO0FBRXRELHVDQUF5QjtBQUN6Qix1Q0FBeUI7QUFDekIsa0RBQTBCO0FBRTFCLHdFQUEwRDtBQUUxRCx5Q0FBd0Q7QUFBL0Msb0dBQUEsT0FBTyxPQUFBO0FBQ2hCLHVEQUFzRDtBQUE3QyxvSEFBQSxnQkFBZ0IsT0FBQTtBQUV6QixNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ1IsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVTtJQUMzQixnQkFBZ0IsRUFBRSxHQUFHO0lBQ3JCLFdBQVcsRUFBRSxnQkFBZ0I7Q0FDaEMsQ0FBQyxDQUFDO0FBRUgsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUM7QUFDcEQsTUFBTSx5QkFBeUIsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDO0FBRXhFLEtBQUssVUFBVSxPQUFPLENBQUMsR0FBVyxFQUFFLE1BQXFCO0lBQ3JELE1BQU0sYUFBYSxHQUFxQjtRQUNwQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUs7UUFDcEIsUUFBUSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUTtRQUNuQyxRQUFRLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRO1FBQ25DLFVBQVUsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFVBQVU7UUFDdkMsZUFBZSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsZUFBZTtRQUNqRCxhQUFhLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxhQUFhLElBQUk7WUFDN0MsUUFBUSxFQUFFO2dCQUNOLEtBQUssRUFBRSxJQUFJO2dCQUNY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