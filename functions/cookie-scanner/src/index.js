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
const utils_1 = require("./helpers/utils");
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
        outDir: (0, path_1.join)(os.tmpdir(), config?.output?.outDir || 'out', (0, utils_1.urlToSafeFilename)(url)),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZFQUErRDtBQUMvRCxtREFBZ0Q7QUFDaEQsK0JBQTRCO0FBQzVCLDJDQUF3RDtBQUN4RCx5REFBc0Q7QUFFdEQsdUNBQXlCO0FBQ3pCLHVDQUF5QjtBQUN6QixrREFBMEI7QUFDMUIsMkNBQW9EO0FBRXBELHdFQUEwRDtBQUUxRCx5Q0FBd0Q7QUFBL0Msb0dBQUEsT0FBTyxPQUFBO0FBQ2hCLHVEQUFzRDtBQUE3QyxvSEFBQSxnQkFBZ0IsT0FBQTtBQUV6QixNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ1IsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVTtJQUMzQixnQkFBZ0IsRUFBRSxHQUFHO0lBQ3JCLFdBQVcsRUFBRSxnQkFBZ0I7Q0FDaEMsQ0FBQyxDQUFDO0FBRUgsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUM7QUFDcEQsTUFBTSx5QkFBeUIsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDO0FBRXhFLEtBQUssVUFBVSxPQUFPLENBQUMsR0FBVyxFQUFFLE1BQXFCO0lBQ3JELE1BQU0sYUFBYSxHQUFxQjtRQUNwQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUs7UUFDcEIsUUFBUSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUTtRQUNuQyxRQUFRLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRO1FBQ25DLFVBQVUsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFVBQVU7UUFDdkMsZUFBZSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsZUFBZTtRQUNqRCxhQUFhLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxhQUFhLElBQUk7WUFDN0MsUUFBUSxFQUFFO2dCQUNOLEtBQUssRUFBRSxJQUFJO2dC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