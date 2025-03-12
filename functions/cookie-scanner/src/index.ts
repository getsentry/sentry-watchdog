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

async function scanUrl(url: string, customConfig?: Partial<CollectorOptions>): Promise<void> {
    const defaultConfig: CollectorOptions = {
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
        outDir: join(
            os.tmpdir(),
            customConfig?.outDir || 'out',
            url
                .replace(/^https?:\/\//, '')
                .replace(/[^a-zA-Z0-9]/g, '_')
                .replace(/_+$/g, '')
        ),
        reportDir: join(os.tmpdir(), customConfig?.reportDir || 'reports'),
        extraPuppeteerOptions: {
            protocolTimeout: 120000, // Increase timeout to 2 minutes
            timeout: 120000, // Page timeout
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

    const result = await collect(formattedUrl, config);

    if (result.status === 'success') {
        console.log(`Scan successful: ${config.outDir}`);
    } else {
        console.error(`Scan failed: ${result.page_response}`);
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
                console.log("Logs forwarded successfully");
            } else {
                console.error("Failed to forward logs. Status code:", response.status);
                console.error("Response content:", response.data);
            }
        } catch (error) {
            console.error("Error forwarding logs:", error);
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
        console.log(`Successfully uploaded report to GCS: ${file_name}`);
    } catch (error) {
        console.error('Error uploading report to GCS:', error);
        Sentry.captureException(error);
        throw error;
    }
}


export const main = functions.http('main', async (rawMessage: functions.Request, res: functions.Response) => {
    const startTime = Date.now();
    try {
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

        let pagesToScan: string[] = parsedData.target;
        let running = 0;
        const queue = [...pagesToScan];

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

                // Use immediately invoked async function to handle each scan
                (async () => {
                    try {
                        console.log(`Attempting first scan for: ${page}`);
                        await scanUrl(page, customConfig);
                    } catch (error) {
                        Sentry.captureException(`First scan attempt failed for ${page}:`, error);
                        console.log(`First scan attempt failed for ${page}:`, error);
                        logForwarding({
                            "status": "info",
                            "message": `First scan failed for ${page}`,
                            "timestamp": new Date().toISOString(),
                        })
                        // if failed, try again
                        try {
                            console.log(`Attempting retry scan for: ${page}`);
                            await scanUrl(page, customConfig);
                        } catch (retryError) {
                            Sentry.captureException(`Retry scan failed for ${page}:`, retryError);
                            console.error(`Retry scan failed for ${page}:`, retryError);
                            logForwarding({
                                "status": "info",
                                "message": `Retry scan failed for ${page}`,
                                "timestamp": new Date().toISOString(),
                            })
                        }
                    } finally {
                        running--;
                        console.log(`Completed processing for: ${page}. Running count: ${running}`);
                        logForwarding({
                            "status": "info",
                            "message": `page scanned: ${page}`,
                            "timestamp": new Date().toISOString(),
                        })
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
        const aggregatedReport = await aggregateReports(customConfig);
        const result = {metadata, result: aggregatedReport}
        console.log('Successfully generated aggregate report:', result);
        await uploadReportToGCS(parsedData.chunk_no, JSON.stringify(result), bucketName, folderName);
        console.log('Successfully uploaded aggregate report to GCS');
        logForwarding({
            "status": "info",
            "message": "scanner completed",
            "timestamp": new Date().toISOString(),
            "data": {
                "chunk_no": parsedData.chunk_no,
                "total_chunks": parsedData.total_chunks,
                "report_url": `https://storage.googleapis.com/${bucketName}/${folderName}${parsedData.chunk_no}.json`,
                "time_spent": `${((Date.now() - startTime) / 1000).toFixed(2)}s`
            }
        })

        // Explicitly ACK by returning 200
        res.status(200).json({
            success: true,
            messageId: rawMessage.body.message.messageId, // Include message ID in response
            report: aggregatedReport
        });
    } catch (error) {
        // Explicitly NACK by returning 500
        console.error('Error in main function:', error);
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
