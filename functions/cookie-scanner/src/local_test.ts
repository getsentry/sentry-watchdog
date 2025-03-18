
import { join } from 'path';
import { collect, CollectorOptions } from './collector';
import { aggregateReports } from './aggregateReports';
import { ScannerConfig } from './types';
import * as fs from 'fs';
import * as os from 'os';

export { collect, CollectorOptions } from './collector';
export { aggregateReports } from './aggregateReports';

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
        //     "timestamp": new Date().toISOString(),
        //     "data": {
        //         "page_url": `${url}`
        //     }
        // })
    } else {
        // These are too noisy for logs, disable for now
        // logForwarding({
        //     "status": "info",
        //     "message": `page scanned successfully`,
        //     "timestamp": new Date().toISOString(),
        //     "data": {
        //         "page_url": `${url}`
        //     }
        // })
    }
}

const INPUT = '{"title": "Sentry Cookie Scanner", "scanner": {"headless": false, "numPages": 0, "captureHar": false, "saveScreenshots": false, "emulateDevice": {"viewport": {"height": 1920, "width": 1080}, "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.3"}}, "maxConcurrent": 20, "chunkSize": 80, "total_pages": 3479, "total_chunks": 44, "chunk_no": 41, "target": ["https://sentry.io/for/python/", "https://blog.sentry.io/stack-trace-line-numbers-for-unity-events/", "https://blog.sentry.io/mitigating-user-friction-with-performance-monitoring/"]}'

const today = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // Format: YYYYMMDD
const folderName = `${today}/`; // Folder with today's date

async function main() {
    const failedPages: string[] = [];

    try {

        // Decode message
        const parsedData = JSON.parse(INPUT);
        const job_id = `${today}[${parsedData.chunk_no}/${parsedData.total_chunks}]`
        console.log("--------------------------------")
        console.log(parsedData.title, " chunk_no: ", parsedData.chunk_no, " of ", parsedData.total_chunks);
        console.log("--------------------------------")

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
                        // if failed, try again
                        try {
                            console.log(`${job_id} Attempting retry scan for: ${page}`);
                            await scanUrl(page, customConfig);
                        } catch (retryError) {
                            console.error(`${job_id} Retry scan failed for ${page}:`, retryError);
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
        const result = {metadata, result: aggregatedReport};
        console.log(result);

        if (failedPages.length > 0) {
            console.log({"failed pages": failedPages,
                    "job_id": job_id,
                    "failed_pages": failedPages
        })

    }} catch (error) {
        console.log({
            "status": "error",
            "message": "scanner failed",
            "timestamp": new Date().toISOString(),
            "data": error.message
        });
    }
}

main();