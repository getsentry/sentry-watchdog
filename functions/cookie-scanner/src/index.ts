import * as functions from '@google-cloud/functions-framework';
import { Storage } from "@google-cloud/storage";
import { join } from 'path';
import { collect, CollectorOptions } from './collector';
import { aggregateReports } from './aggregateReports';
import { ScannerConfig } from './types';
import * as fs from 'fs';
import * as os from 'os';
import axios from "axios";

import * as Sentry from "@sentry/node";

export { collect, CollectorOptions } from './collector';
export { aggregateReports } from './aggregateReports';

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

async function scanUrl(url: string, config: ScannerConfig): Promise<void> {
    const scannerConfig: CollectorOptions = {
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
        outDir: join(
            os.tmpdir(),
            config?.output?.outDir || 'out',
            url
                .replace(/^https?:\/\//, '')
                .replace(/[^a-zA-Z0-9]/g, '_')
                .replace(/_+$/g, '')
        ),
        reportDir: join(os.tmpdir(), config?.output?.reportDir || 'reports'),
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

    const result = await collect(formattedUrl, scannerConfig);

    if (result.status === 'success') {
        logForwarding({
            "status": "info",
            "message": `page scanned: ${url}`,
            "timestamp": new Date().toISOString(),
        })
    } else {
        logForwarding({
            "status": "info",
            "message": `page scanned: ${url}`,
            "timestamp": new Date().toISOString(),
        })
    }
}

// Forward logs to SIEM webhook
async function logForwarding(data: Record<string, any>): Promise<void> {
    if (LOG_DESTINATION && LOG_FORWARDING_AUTH_TOKEN) {
        const headers = {
            "Authorization": `Bearer ${LOG_FORWARDING_AUTH_TOKEN}`,
            "Content-Type": "application/json",
        };

        try {
            const response = await axios.post(LOG_DESTINATION, data, { headers, timeout: 10000 });
            
            if (response.status === 200 || response.status === 204) {
                
            } else {
                Sentry.captureException(response.data);
            }
        } catch (error) {
            Sentry.captureException(error);
        }
    }
}

const bucketName = process.env.AGGREGATE_REPORTS_BUCKET;
const today = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // Format: YYYYMMDD
const folderName = `${today}/`; // Folder with today's date

async function uploadReportToGCS(file_name: string, report: string, bucketName: string, folderName: string) {
    const storage = new Storage();
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
    } catch (error) {
        Sentry.captureException(error);
        throw error;
    }
}


export const main = functions.http('main', async (rawMessage: functions.Request, res: functions.Response) => {
    const startTime = Date.now();
    const failedPages: string[] = [];

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
            } catch (error) {
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
        console.log("--------------------------------")
        console.log(parsedData.title, " chunk_no: ", parsedData.chunk_no, " of ", parsedData.total_chunks);
        console.log("--------------------------------")
        logForwarding({
            "status": "info",
            "message": "scanner started",
            "timestamp": new Date().toISOString(),
            "data": {
                "chunk_no": parsedData.chunk_no,
                "total_chunks": parsedData.total_chunks,
                "total_pages": parsedData.total_pages
            }
        })

        const metadata = {
            title: parsedData.title,
            date: folderName,
            chunk_no: parsedData.chunk_no,
            total_chunks: parsedData.total_chunks,
            total_pages: parsedData.total_pages
        }

        const { title, scanner, target, maxConcurrent } = parsedData;
        const customConfig: ScannerConfig = {
            title,
            scanner,
            target,
            maxConcurrent,
            output: {
                outDir: 'out',
                reportDir: 'reports'
            }
        };
        const job_id = `[${parsedData.chunk_no}/${parsedData.total_chunks}]`

        let pagesToScan: string[] = parsedData.target;
        let running = 0;
        const queue = [...pagesToScan];
        const scanPromises: Promise<void>[] = []; // Track all scan promises

        try {
            if (!fs.existsSync(join(os.tmpdir(), customConfig.output.outDir))) {
                fs.mkdirSync(join(os.tmpdir(), customConfig.output.outDir), { recursive: true });
            }

            if (!fs.existsSync(join(os.tmpdir(), customConfig.output.reportDir))) {
                fs.mkdirSync(join(os.tmpdir(), customConfig.output.reportDir), { recursive: true });
            }
        } catch (dirError) {
            console.error('Error creating directories:', dirError);
            Sentry.captureException(dirError);
            throw dirError;
        }

        async function processNext() {
            while (queue.length > 0 && running < maxConcurrent) {
                const page = queue.shift()!;
                running++;

                // Create promise for each scan and track it
                const scanPromise = (async () => {
                    try {
                        await scanUrl(page, customConfig);
                    } catch (error) {
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
                        } catch (retryError) {
                            Sentry.captureException(`Retry scan failed for ${page}:`, retryError);
                            console.error(`${job_id} Retry scan failed for ${page}:`, retryError);
                            logForwarding({
                                "status": "info",
                                "message": `Retry scan failed for ${page}`,
                                "timestamp": new Date().toISOString(),
                            });
                            failedPages.push(page);
                        }
                    } finally {
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
        const aggregatedReport = await aggregateReports(customConfig);
        const result = {metadata, result: aggregatedReport};
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
    } catch (error) {
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
