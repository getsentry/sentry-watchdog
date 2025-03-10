import * as functions from '@google-cloud/functions-framework';
import { join } from 'path';
import { collect, CollectorOptions } from './collector';
import { aggregateReports } from './aggregateReports';
import { ScannerConfig } from './types';
import * as fs from 'fs';
import * as os from 'os';

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

export const main = functions.http('main', async (rawMessage: functions.Request, res: functions.Response) => {
    try {
        // Decode message
        const data = rawMessage.body.message.data ? Buffer.from(rawMessage.body.message.data, 'base64').toString() : '{}';
        const parsedData = JSON.parse(data);
        console.log("--------------------------------")
        console.log(parsedData.title, " chunk_no: ", parsedData.chunk_no, " of ", parsedData.total_chunks);
        console.log("--------------------------------")

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
                        console.log(`First scan attempt failed for ${page}:`, error);
                        // if failed, try again
                        try {
                            console.log(`Attempting retry scan for: ${page}`);
                            await scanUrl(page, customConfig);
                        } catch (retryError) {
                            console.error(`Retry scan failed for ${page}:`, retryError);
                        }
                    } finally {
                        running--;
                        console.log(`Completed processing for: ${page}. Running count: ${running}`);
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
        console.log('Successfully generated aggregate report:', aggregatedReport);

        res.status(200).json({
            success: true,
            report: aggregatedReport
        });
    } catch (error) {
        console.error('Error in main function:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});
