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
                console.log("Logs forwarded successfully");
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
                        Sentry.captureMessage(`First scan attempt failed for ${page}:`, error);
                        logForwarding({
                            "status": "info",
                            "message": `First scan failed for ${page}`,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZFQUErRDtBQUMvRCxtREFBZ0Q7QUFDaEQsK0JBQTRCO0FBQzVCLDJDQUF3RDtBQUN4RCx5REFBc0Q7QUFFdEQsdUNBQXlCO0FBQ3pCLHVDQUF5QjtBQUN6QixrREFBMEI7QUFFMUIscURBQXVDO0FBRXZDLHlDQUF3RDtBQUEvQyxvR0FBQSxPQUFPLE9BQUE7QUFDaEIsdURBQXNEO0FBQTdDLG9IQUFBLGdCQUFnQixPQUFBO0FBRXpCLDhCQUE4QjtBQUM5QixJQUFJO0FBQ0osd0NBQXdDO0FBQ3hDLG1CQUFtQjtBQUNuQiw0QkFBNEI7QUFDNUIseUJBQXlCO0FBQ3pCLCtCQUErQjtBQUMvQixvQ0FBb0M7QUFDcEMsNkJBQTZCO0FBQzdCLDRCQUE0QjtBQUM1QixrQ0FBa0M7QUFDbEMsZ0NBQWdDO0FBQ2hDLGlCQUFpQjtBQUNqQiw0SUFBNEk7QUFDNUksWUFBWTtBQUNaLFNBQVM7QUFDVCwyQkFBMkI7QUFDM0Isd0JBQXdCO0FBQ3hCLDJCQUEyQjtBQUMzQix5QkFBeUI7QUFDekIscUJBQXFCO0FBQ3JCLGtCQUFrQjtBQUNsQiwrQkFBK0I7QUFDL0IsK0JBQStCO0FBQy9CLCtCQUErQjtBQUMvQiwrQkFBK0I7QUFDL0IsY0FBYztBQUNkLFFBQVE7QUFDUixJQUFJO0FBRUosTUFBTSxDQUFDLElBQUksQ0FBQztJQUNSLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVU7SUFDM0IsZ0JBQWdCLEVBQUUsR0FBRztJQUNyQixXQUFXLEVBQUUsZ0JBQWdCO0NBQ2hDLENBQUMsQ0FBQztBQUVILE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDO0FBQ3BELE1BQU0seUJBQXlCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQztBQUV4RSxLQUFLLFVBQVUsT0FBTyxDQUFDLEdBQVcsRUFBRSxZQUF3QztJQUN4RSxNQUFNLGFBQWEsR0FBcUI7UUFDcEMsS0FBSyxFQUFFLFlBQVksRUFBRSxLQUFLO1FBQzFCLFFBQVEsRUFBRSxZQUFZLEVBQUUsUUFBUTtRQUNoQyxRQUFRLEVBQUUsWUFBWSxFQUFFLFFBQVE7UUFDaEMsVUFBVSxFQUFFLFlBQVksRUFBRSxVQUFVO1FBQ3BDLGVBQWUsRUFBRSxZQUFZLEVBQUUsZUFBZTtRQUM5QyxhQUFhLEVBQUU7WUFDWCxRQUFRLEVBQUU7Z0JBQ04sS0FBSyxFQUFFLElBQUk7Z0JBQ1gsTUFBTSxFQUFFLEdBQUc7YUFDZDtZQUNELFNBQVMsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLFNBQVM7Z0JBQzdDLGlIQUFpSDtTQUN4SDtRQUNELE1BQU0sRUFBRSxJQUFBLFdBQUksRUFDUixFQUFFLENBQUMsTUFBTSxFQUFFLEVBQ1gsWUFBWSxFQUFFLE1BQU0sSUFBSSxLQUFLLEVBQzdCLEdBQUc7YUFDRSxPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQzthQUMzQixPQUFPLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQzthQUM3QixPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUMzQjtRQUNELFNBQVMsRUFBRSxJQUFBLFdBQUksRUFBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsWUFBWSxFQUFFLFNBQVMsSUFBSSxTQUFTLENBQUM7UUFDbEUscUJBQXFCLEVBQUU7WUFDbkIsZUFBZSxFQUFFLE1BQU07WUFDdkIsT0FBTyxFQUFFLE1BQU07WUFDZixJQUFJLEVBQUU7Z0JBQ0YsY0FBYztnQkFDZCwwQkFBMEI7Z0JBQzFCLHlCQUF5QjtnQkFDekIsaUNBQWlDO2dCQUNqQyxlQUFlO2FBQ2xCO1NBQ0o7S0FDSixDQUFDO0lBRUYsTUFBTSxNQUFNLEdBQUcsRUFBRSxHQUFHLGFBQWEsRUFBRSxHQUFHLFlBQVksRUFBRSxDQUFDO0lBQ3JELE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQztJQUVyRSwyQ0FBMkM7SUFFM0MsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLG1CQUFPLEVBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBRW5ELElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxTQUFTLEVBQUU7UUFDN0IsYUFBYSxDQUFDO1lBQ1YsUUFBUSxFQUFFLE1BQU07WUFDaEIsU0FBUyxFQUFFLGlCQUFpQixHQUFHLEVBQUU7WUFDakMsV0FBVyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO1NBQ3hDLENBQUMsQ0FBQTtLQUNMO1NBQU07UUFDSCxhQUFhLENBQUM7WUFDVixRQUFRLEVBQUUsTUFBTTtZQUNoQixTQUFTLEVBQUUsaUJBQWlCLEdBQUcsRUFBRTtZQUNqQyxXQUFXLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7U0FDeEMsQ0FBQyxDQUFBO0tBQ0w7QUFDTCxDQUFDO0FBRUQsK0JBQStCO0FBQy9CLEtBQUssVUFBVSxhQUFhLENBQUMsSUFBeUI7SUFDbEQsSUFBSSxlQUFlLElBQUkseUJBQXlCLEVBQUU7UUFDOUMsTUFBTSxPQUFPLEdBQUc7WUFDWixlQUFlLEVBQUUsVUFBVSx5QkFBeUIsRUFBRTtZQUN0RCxjQUFjLEVBQUUsa0JBQWtCO1NBQ3JDLENBQUM7UUFFRixJQUFJO1lBQ0EsTUFBTSxRQUFRLEdBQUcsTUFBTSxlQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLEVBQUUsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFFdEYsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLEdBQUcsRUFBRTtnQkFDcEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO2FBQzlDO2lCQUFNO2dCQUNILE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDMUM7U0FDSjtRQUFDLE9BQU8sS0FBSyxFQUFFO1lBQ1osTUFBTSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ2xDO0tBQ0o7QUFDTCxDQUFDO0FBRUQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQztBQUN4RCxNQUFNLEtBQUssR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLG1CQUFtQjtBQUMxRixNQUFNLFVBQVUsR0FBRyxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUMsMkJBQTJCO0FBRTNELEtBQUssVUFBVSxpQkFBaUIsQ0FBQyxTQUFpQixFQUFFLE1BQWMsRUFBRSxVQUFrQixFQUFFLFVBQWtCO0lBQ3RHLE1BQU0sT0FBTyxHQUFHLElBQUksaUJBQU8sRUFBRSxDQUFDO0lBQzlCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDMUMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLFVBQVUsR0FBRyxTQUFTLE9BQU8sQ0FBQyxDQUFDO0lBQzNELElBQUk7UUFDQSxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ3BCLE1BQU0sRUFBRSxLQUFLO1lBQ2IsUUFBUSxFQUFFO2dCQUNOLFdBQVcsRUFBRSxrQkFBa0I7YUFDbEM7U0FDSixDQUFDLENBQUM7UUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLHlFQUF5RSxVQUFVLElBQUksVUFBVSxHQUFHLFNBQVMsT0FBTyxDQUFDLENBQUM7S0FDckk7SUFBQyxPQUFPLEtBQUssRUFBRTtRQUNaLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQixNQUFNLEtBQUssQ0FBQztLQUNmO0FBQ0wsQ0FBQztBQUdZLFFBQUEsSUFBSSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxVQUE2QixFQUFFLEdBQXVCLEVBQUUsRUFBRTtJQUN4RyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDN0IsSUFBSTtRQUNBLGlCQUFpQjtRQUNqQixNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDbEgsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNwQyxPQUFPLENBQUMsR0FBRyxDQUFDLGtDQUFrQyxDQUFDLENBQUE7UUFDL0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLGFBQWEsRUFBRSxVQUFVLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDbkcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFBO1FBQy9DLGFBQWEsQ0FBQztZQUNWLFFBQVEsRUFBRSxNQUFNO1lBQ2hCLFNBQVMsRUFBRSxpQkFBaUI7WUFDNUIsV0FBVyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO1lBQ3JDLE1BQU0sRUFBRTtnQkFDSixVQUFVLEVBQUUsVUFBVSxDQUFDLFFBQVE7Z0JBQy9CLGNBQWMsRUFBRSxVQUFVLENBQUMsWUFBWTtnQkFDdkMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxXQUFXO2FBQ3hDO1NBQ0osQ0FBQyxDQUFBO1FBRUYsTUFBTSxRQUFRLEdBQUc7WUFDYixLQUFLLEVBQUUsVUFBVSxDQUFDLEtBQUs7WUFDdkIsSUFBSSxFQUFFLFVBQVU7WUFDaEIsUUFBUSxFQUFFLFVBQVUsQ0FBQyxRQUFRO1lBQzdCLFlBQVksRUFBRSxVQUFVLENBQUMsWUFBWTtZQUNyQyxXQUFXLEVBQUUsVUFBVSxDQUFDLFdBQVc7U0FDdEMsQ0FBQTtRQUVELE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsR0FBRyxVQUFVLENBQUM7UUFDN0QsTUFBTSxZQUFZLEdBQWtCO1lBQ2hDLEtBQUs7WUFDTCxPQUFPO1lBQ1AsTUFBTTtZQUNOLGFBQWE7WUFDYixNQUFNLEVBQUU7Z0JBQ0osTUFBTSxFQUFFLEtBQUs7Z0JBQ2IsU0FBUyxFQUFFLFNBQVM7YUFDdkI7U0FDSixDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsSUFBSSxVQUFVLENBQUMsUUFBUSxJQUFJLFVBQVUsQ0FBQyxZQUFZLEdBQUcsQ0FBQTtRQUVwRSxJQUFJLFdBQVcsR0FBYSxVQUFVLENBQUMsTUFBTSxDQUFDO1FBQzlDLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQztRQUNoQixNQUFNLEtBQUssR0FBRyxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUM7UUFDL0IsTUFBTSxZQUFZLEdBQW9CLEVBQUUsQ0FBQyxDQUFDLDBCQUEwQjtRQUVwRSxJQUFJO1lBQ0EsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBQSxXQUFJLEVBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRTtnQkFDL0QsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFBLFdBQUksRUFBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsWUFBWSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2FBQ3BGO1lBRUQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBQSxXQUFJLEVBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLFlBQVksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRTtnQkFDbEUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFBLFdBQUksRUFBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsWUFBWSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2FBQ3ZGO1NBQ0o7UUFBQyxPQUFPLFFBQVEsRUFBRTtZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdkQsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2xDLE1BQU0sUUFBUSxDQUFDO1NBQ2xCO1FBRUQsS0FBSyxVQUFVLFdBQVc7WUFDdEIsT0FBTyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxPQUFPLEdBQUcsYUFBYSxFQUFFO2dCQUNoRCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsS0FBSyxFQUFHLENBQUM7Z0JBQzVCLE9BQU8sRUFBRSxDQUFDO2dCQUVWLDRDQUE0QztnQkFDNUMsTUFBTSxXQUFXLEdBQUcsQ0FBQyxLQUFLLElBQUksRUFBRTtvQkFDNUIsSUFBSTt3QkFDQSxNQUFNLE9BQU8sQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7cUJBQ3JDO29CQUFDLE9BQU8sS0FBSyxFQUFFO3dCQUNaLE1BQU0sQ0FBQyxjQUFjLENBQUMsaUNBQWlDLElBQUksR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO3dCQUN2RSxhQUFhLENBQUM7NEJBQ1YsUUFBUSxFQUFFLE1BQU07NEJBQ2hCLFNBQVMsRUFBRSx5QkFBeUIsSUFBSSxFQUFFOzRCQUMxQyxXQUFXLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7eUJBQ3hDLENBQUMsQ0FBQzt3QkFDSCx1QkFBdUI7d0JBQ3ZCLElBQUk7NEJBQ0EsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sK0JBQStCLElBQUksRUFBRSxDQUFDLENBQUM7NEJBQzVELE1BQU0sT0FBTyxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQzt5QkFDckM7d0JBQUMsT0FBTyxVQUFVLEVBQUU7NEJBQ2pCLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyx5QkFBeUIsSUFBSSxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7NEJBQ3RFLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxNQUFNLDBCQUEwQixJQUFJLEdBQUcsRUFBRSxVQUFVLENBQUMsQ0FBQzs0QkFDdEUsYUFBYSxDQUFDO2dDQUNWLFFBQVEsRUFBRSxNQUFNO2dDQUNoQixTQUFTLEVBQUUseUJBQXlCLElBQUksRUFBRTtnQ0FDMUMsV0FBVyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFOzZCQUN4QyxDQUFDLENBQUM7eUJBQ047cUJBQ0o7NEJBQVM7d0JBQ04sT0FBTyxFQUFFLENBQUM7cUJBQ2I7Z0JBQ0wsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFFTCxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUMvQixXQUFXLEVBQUUsQ0FBQyxDQUFDLGlDQUFpQzthQUNuRDtRQUNMLENBQUM7UUFFRCx1QkFBdUI7UUFDdkIsTUFBTSxXQUFXLEVBQUUsQ0FBQztRQUVwQix5Q0FBeUM7UUFDekMsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRXZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLG1EQUFtRCxDQUFDLENBQUM7UUFDMUUsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLElBQUEsbUNBQWdCLEVBQUMsWUFBWSxDQUFDLENBQUM7UUFDOUQsTUFBTSxNQUFNLEdBQUcsRUFBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLGdCQUFnQixFQUFDLENBQUM7UUFDcEQsTUFBTSxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRTdGLGFBQWEsQ0FBQztZQUNWLFFBQVEsRUFBRSxNQUFNO1lBQ2hCLFNBQVMsRUFBRSxzQkFBc0I7WUFDakMsV0FBVyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO1lBQ3JDLE1BQU0sRUFBRTtnQkFDSixVQUFVLEVBQUUsVUFBVSxDQUFDLFFBQVE7Z0JBQy9CLGNBQWMsRUFBRSxVQUFVLENBQUMsWUFBWTtnQkFDdkMsWUFBWSxFQUFFLGtDQUFrQyxVQUFVLElBQUksVUFBVSxHQUFHLFVBQVUsQ0FBQyxRQUFRLE9BQU87Z0JBQ3JHLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHO2FBQ25FO1NBQ0osQ0FBQyxDQUFDO1FBRUgsa0NBQWtDO1FBQ2xDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ2pCLE9BQU8sRUFBRSxJQUFJO1lBQ2IsU0FBUyxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVM7WUFDNUMsTUFBTSxFQUFFLGdCQUFnQjtTQUMzQixDQUFDLENBQUM7S0FDTjtJQUFDLE9BQU8sS0FBSyxFQUFFO1FBQ1osbUNBQW1DO1FBQ25DLGFBQWEsQ0FBQztZQUNWLFFBQVEsRUFBRSxPQUFPO1lBQ2pCLFNBQVMsRUFBRSxnQkFBZ0I7WUFDM0IsV0FBVyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO1lBQ3JDLE1BQU0sRUFBRSxLQUFLLENBQUMsT0FBTztTQUN4QixDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0IsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDakIsT0FBTyxFQUFFLEtBQUs7WUFDZCxTQUFTLEVBQUUsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUztZQUM1QyxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU87WUFDcEIsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO1NBQ3JCLENBQUMsQ0FBQztLQUNOO0FBQ0wsQ0FBQyxDQUFDLENBQUMifQ==