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
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateReports = exports.collect = void 0;
const path_1 = require("path");
const collector_1 = require("./collector");
const aggregateReports_1 = require("./aggregateReports");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
var collector_2 = require("./collector");
Object.defineProperty(exports, "collect", { enumerable: true, get: function () { return collector_2.collect; } });
var aggregateReports_2 = require("./aggregateReports");
Object.defineProperty(exports, "aggregateReports", { enumerable: true, get: function () { return aggregateReports_2.aggregateReports; } });
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
        //     "timestamp": new Date().toISOString(),
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
        //     "timestamp": new Date().toISOString(),
        //     "data": {
        //         "page_url": `${url}`
        //     }
        // })
    }
}
const INPUT = '{"title": "Sentry Cookie Scanner", "scanner": {"headless": false, "numPages": 0, "captureHar": false, "saveScreenshots": false, "emulateDevice": {"viewport": {"height": 1920, "width": 1080}, "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.3"}}, "maxConcurrent": 20, "chunkSize": 80, "total_pages": 3479, "total_chunks": 44, "chunk_no": 41, "target": ["https://sentry.io/for/python/", "https://blog.sentry.io/stack-trace-line-numbers-for-unity-events/", "https://blog.sentry.io/mitigating-user-friction-with-performance-monitoring/"]}';
const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // Format: YYYYMMDD
const folderName = `${today}/`; // Folder with today's date
async function main() {
    const failedPages = [];
    try {
        // Decode message
        const parsedData = JSON.parse(INPUT);
        const job_id = `${today}[${parsedData.chunk_no}/${parsedData.total_chunks}]`;
        console.log('--------------------------------');
        console.log(parsedData.title, ' chunk_no: ', parsedData.chunk_no, ' of ', parsedData.total_chunks);
        console.log('--------------------------------');
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
                        // if failed, try again
                        try {
                            console.log(`${job_id} Attempting retry scan for: ${page}`);
                            await scanUrl(page, customConfig);
                        }
                        catch (retryError) {
                            console.error(`${job_id} Retry scan failed for ${page}:`, retryError);
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
        const result = { metadata, result: aggregatedReport };
        console.log(result);
        if (failedPages.length > 0) {
            console.log({ 'failed pages': failedPages, job_id: job_id, failed_pages: failedPages });
        }
    }
    catch (error) {
        console.log({
            status: 'error',
            message: 'scanner failed',
            timestamp: new Date().toISOString(),
            data: error.message
        });
    }
}
main();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxfdGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImxvY2FsX3Rlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0JBQTRCO0FBQzVCLDJDQUF3RDtBQUN4RCx5REFBc0Q7QUFFdEQsdUNBQXlCO0FBQ3pCLHVDQUF5QjtBQUV6Qix5Q0FBd0Q7QUFBL0Msb0dBQUEsT0FBTyxPQUFBO0FBQ2hCLHVEQUFzRDtBQUE3QyxvSEFBQSxnQkFBZ0IsT0FBQTtBQUV6QixLQUFLLFVBQVUsT0FBTyxDQUFDLEdBQVcsRUFBRSxNQUFxQjtJQUNyRCxNQUFNLGFBQWEsR0FBcUI7UUFDcEMsS0FBSyxFQUFFLE1BQU0sRUFBRSxLQUFLO1FBQ3BCLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVE7UUFDbkMsUUFBUSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUTtRQUNuQyxVQUFVLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxVQUFVO1FBQ3ZDLGVBQWUsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLGVBQWU7UUFDakQsYUFBYSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsYUFBYSxJQUFJO1lBQzdDLFFBQVEsRUFBRTtnQkFDTixLQUFLLEVBQUUsSUFBSTtnQkFDWCxNQUFNLEVBQUUsR0FBRzthQUNkO1lBQ0QsU0FBUyxFQUFFLGlIQUFpSDtTQUMvSDtRQUNELE1BQU0sRUFBRSxJQUFBLFdBQUksRUFDUixFQUFFLENBQUMsTUFBTSxFQUFFLEVBQ1gsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksS0FBSyxFQUMvQixHQUFHO2FBQ0UsT0FBTyxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUM7YUFDM0IsT0FBTyxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUM7YUFDN0IsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FDM0I7UUFDRCxTQUFTLEVBQUUs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