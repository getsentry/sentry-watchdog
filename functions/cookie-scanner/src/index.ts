import * as functions from '@google-cloud/functions-framework';
import { join } from 'path';
import { collect, CollectorOptions } from './collector';
import { aggregateReports } from './aggregateReports';

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

interface ScannerConfig {
    title: string;
    scanner: {
        headless: boolean;
        numPages: number;
        captureHar: boolean;
        saveScreenshots: boolean;
        emulateDevice: {
            viewport: {
                height: number;
                width: number;
            };
            userAgent: string;
        };
        extraChromiumArgs: string[];
        extraPuppeteerOptions?: {
            protocolTimeout?: number;
        };
    };
    output: {
        outDir: string;
        reportDir: string;
    };
    target: string[];
    maxConcurrent: number;
}

async function scanUrl(url: string, customConfig?: Partial<CollectorOptions>): Promise<void> {
    const defaultConfig: CollectorOptions = {
        title: customConfig?.title,
        headless: customConfig?.headless,
        numPages: customConfig?.numPages,
        captureHar: customConfig?.captureHar,
        saveScreenshots: customConfig?.saveScreenshots,
        emulateDevice: customConfig?.emulateDevice,
        outDir: join(
            __dirname,
            customConfig?.outDir || 'out',
            url
                .replace(/^https?:\/\//, '')
                .replace(/[^a-zA-Z0-9]/g, '_')
                .replace(/_+$/g, '')
        ),
        reportDir: join(__dirname, customConfig?.reportDir || 'reports'),
        extraPuppeteerOptions: {
            protocolTimeout: 60000 // Increase timeout to 60 seconds
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

        console.log('Processing URL:', parsedData.url);
        const customConfig = parsedData as ScannerConfig;
        let pagesToScan: string[] = parsedData.target;
        const maxConcurrent = parsedData.maxConcurrent;
        let running = 0;
        const queue = [...pagesToScan];

        async function processNext() {
            while (queue.length > 0 && running < maxConcurrent) {
                const page = queue.shift()!;
                running++;

                // Use immediately invoked async function to handle each scan
                (async () => {
                    try {
                        await scanUrl(page, customConfig);
                    } catch (error) {
                        // if failed, try again
                        await scanUrl(page, customConfig);
                    } finally {
                        running--;
                        // Try to process next item when this one is done
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

        res.status(200).json({
            success: true,
            report: await aggregateReports()
        });
    } catch (error) {
        console.error('Error processing URL:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
