import * as functions from '@google-cloud/functions-framework';
import { Storage } from "@google-cloud/storage";
import { join } from 'path';
import { collect, CollectorOptions } from './collector';
import { aggregateReports } from './aggregateReports';
import { ScannerConfig, LogFormat } from './types';
import * as fs from 'fs';
import * as os from 'os';
import axios from "axios";

import * as Sentry from "@sentry/google-cloud-serverless";

export { collect, CollectorOptions } from './collector';
export { aggregateReports } from './aggregateReports';

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
        // These are too noisy for logs, disable for now
        // logForwarding({
        //     "status": "info",
        //     "message": `page scanned successfully`,
        //     "timestamp": getRFC3339Date(),
        //     "data": {
        //         "page_url": `${url}`
        //     }
        // })
    } else {
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

function getRFC3339Date(): string {
    const date = new Date().toISOString();; // "2024-03-18T12:34:56.789Z"
    // Convert "Z" to "+00:00" for strict RFC 3339 compliance
    return date.replace("Z", "+00:00");
}

// Forward logs to SIEM webhook
async function logForwarding(data: LogFormat): Promise<void> {
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
const today = getRFC3339Date().slice(0, 10).replace(/-/g, ""); // Format: YYYYMMDD
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

interface Result {
    metadata: {
        title: string;
        date: string;
        chunk_no: string;
        total_chunks: string;
        total_pages: string;
    };
    result: string;
    [key: string]: any; // Allows any additional string keys with any value type
}

export const main = functions.http('main', async (rawMessage: functions.Request, res: functions.Response) => {
    const startTime = Date.now();
    const failedPages: string[] = [];

    try {
        // Decode message and get necessary PubSub details
        const message = rawMessage.body.message;
        const data = message.data ? Buffer.from(message.data, 'base64').toString() : '{}';
        const parsedData = JSON.parse(data);
        const job_id = `${today}[${parsedData.chunk_no}/${parsedData.total_chunks}]`;
        console.log("--------------------------------")
        console.log(parsedData.title, " chunk_no: ", parsedData.chunk_no, " of ", parsedData.total_chunks);
        console.log("--------------------------------")
        logForwarding({
            "status": "info",
            "message": "scanner started",
            "timestamp": getRFC3339Date(),
            "data": {
                "job_id": job_id,
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
                        // failure are usually due to network issues, so try again
                        try {
                            console.log(`${job_id} Attempting retry scan for: ${page}`);
                            await scanUrl(page, customConfig);
                        } catch (retryError) {
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

        console.log(`${job_id} All scans completed, generating aggregate report`);
        const aggregatedReport = await aggregateReports(customConfig);
        const report: Result = {
            metadata: metadata,
            result: aggregatedReport,
            // only add failed_pages if there are any
            ...(failedPages.length > 0 && { failed_pages: failedPages })
        };

        await uploadReportToGCS(parsedData.chunk_no, JSON.stringify(report), bucketName, folderName);
        
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

        res.status(200).json({
            success: true,
            messageId: message.messageId,
            report: aggregatedReport
        });
    } catch (error) {
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
