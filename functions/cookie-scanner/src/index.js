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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSw2RUFBK0Q7QUFDL0QsbURBQWdEO0FBQ2hELCtCQUE0QjtBQUM1QiwyQ0FBd0Q7QUFDeEQseURBQXNEO0FBRXRELHVDQUF5QjtBQUN6Qix1Q0FBeUI7QUFDekIsa0RBQTBCO0FBQzFCLDJDQUFvRDtBQUVwRCx3RUFBMEQ7QUFFMUQseUNBQXdEO0FBQS9DLG9HQUFBLE9BQU8sT0FBQTtBQUNoQix1REFBc0Q7QUFBN0Msb0hBQUEsZ0JBQWdCLE9BQUE7QUFFekIsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNSLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVU7SUFDM0IsZ0JBQWdCLEVBQUUsR0FBRztJQUNyQixXQUFXLEVBQUUsZ0JBQWdCO0NBQ2hDLENBQUMsQ0FBQztBQUVILE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDO0FBQ3BELE1BQU0seUJBQXlCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQztBQUV4RSxLQUFLLFVBQVUsT0FBTyxDQUFDLEdBQVcsRUFBRSxNQUFxQjtJQUNyRCxNQUFNLGFBQWEsR0FBcUI7UUFDcEMsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLO1FBQ3BCLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVE7UUFDbkMsUUFBUSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUTtRQUNuQyxVQUFVLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxVQUFVO1FBQ3ZDLGVBQWUsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLGVBQWU7UUFDakQsYUFBYSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsYUFBYSxJQUFJO1lBQzdDLFFBQVEsRUFBRTtnQkFDTixLQUFLLEVB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