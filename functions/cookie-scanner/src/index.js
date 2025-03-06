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
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = exports.aggregateReports = exports.collect = void 0;
const functions = __importStar(require("@google-cloud/functions-framework"));
const path_1 = require("path");
const collector_1 = require("./collector");
const aggregateReports_1 = require("./aggregateReports");
var collector_2 = require("./collector");
Object.defineProperty(exports, "collect", { enumerable: true, get: function () { return collector_2.collect; } });
var aggregateReports_2 = require("./aggregateReports");
Object.defineProperty(exports, "aggregateReports", { enumerable: true, get: function () { return aggregateReports_2.aggregateReports; } });
async function scanUrl(url, customConfig) {
    const defaultConfig = {
        title: customConfig?.title,
        headless: customConfig?.headless,
        numPages: customConfig?.numPages,
        captureHar: customConfig?.captureHar,
        saveScreenshots: customConfig?.saveScreenshots,
        emulateDevice: customConfig?.emulateDevice,
        outDir: (0, path_1.join)(__dirname, customConfig?.outDir || 'out', url
            .replace(/^https?:\/\//, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+$/g, '')),
        reportDir: (0, path_1.join)(__dirname, customConfig?.reportDir || 'reports'),
        extraPuppeteerOptions: {
            protocolTimeout: 60000 // Increase timeout to 60 seconds
        }
    };
    const config = { ...defaultConfig, ...customConfig };
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    // console.log(`Beginning scan of ${url}`);
    const result = await (0, collector_1.collect)(formattedUrl, config);
    if (result.status === 'success') {
        console.log(`Scan successful: ${config.outDir}`);
    }
    else {
        console.error(`Scan failed: ${result.page_response}`);
    }
}
exports.main = functions.http('main', async (rawMessage, res) => {
    try {
        // Decode message
        const data = rawMessage.body.message.data ? Buffer.from(rawMessage.body.message.data, 'base64').toString() : '{}';
        const parsedData = JSON.parse(data);
        console.log("--------------------------------");
        console.log(parsedData.title, " chunk_no: ", parsedData.chunk_no, " of ", parsedData.total_chunks);
        console.log("--------------------------------");
        console.log('Processing URL:', parsedData.url);
        const customConfig = parsedData;
        let pagesToScan = parsedData.target;
        const maxConcurrent = parsedData.maxConcurrent;
        let running = 0;
        const queue = [...pagesToScan];
        async function processNext() {
            while (queue.length > 0 && running < maxConcurrent) {
                const page = queue.shift();
                running++;
                // Use immediately invoked async function to handle each scan
                (async () => {
                    try {
                        await scanUrl(page, customConfig);
                    }
                    catch (error) {
                        // if failed, try again
                        await scanUrl(page, customConfig);
                    }
                    finally {
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
            report: await (0, aggregateReports_1.aggregateReports)()
        });
    }
    catch (error) {
        console.error('Error processing URL:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZFQUErRDtBQUMvRCwrQkFBNEI7QUFDNUIsMkNBQXdEO0FBQ3hELHlEQUFzRDtBQUV0RCx5Q0FBd0Q7QUFBL0Msb0dBQUEsT0FBTyxPQUFBO0FBQ2hCLHVEQUFzRDtBQUE3QyxvSEFBQSxnQkFBZ0IsT0FBQTtBQTJEekIsS0FBSyxVQUFVLE9BQU8sQ0FBQyxHQUFXLEVBQUUsWUFBd0M7SUFDeEUsTUFBTSxhQUFhLEdBQXFCO1FBQ3BDLEtBQUssRUFBRSxZQUFZLEVBQUUsS0FBSztRQUMxQixRQUFRLEVBQUUsWUFBWSxFQUFFLFFBQVE7UUFDaEMsUUFBUSxFQUFFLFlBQVksRUFBRSxRQUFRO1FBQ2hDLFVBQVUsRUFBRSxZQUFZLEVBQUUsVUFBVTtRQUNwQyxlQUFlLEVBQUUsWUFBWSxFQUFFLGVBQWU7UUFDOUMsYUFBYSxFQUFFLFlBQVksRUFBRSxhQUFhO1FBQzFDLE1BQU0sRUFBRSxJQUFBLFdBQUksRUFDUixTQUFTLEVBQ1QsWUFBWSxFQUFFLE1BQU0sSUFBSSxLQUFLLEVBQzdCLEdBQUc7YUFDRSxPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQzthQUMzQixPQUFPLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQzthQUM3QixPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUMzQjtRQUNELFNBQVMsRUFBRSxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUsWUFBWSxFQUFFLFNBQVMsSUFBSSxTQUFTLENBQUM7UUFDaEUscUJBQXFCLEVBQUU7WUFDbkIsZUFBZSxFQUFFLEtBQUssQ0FBQyxpQ0FBaUM7U0FDM0Q7S0FDSixDQUFDO0lBRUYsTUFBTSxNQUFNLEdBQUcsRUFBRSxHQUFHLGFBQWEsRUFBRSxHQUFHLFlBQVksRUFBRSxDQUFDO0lBQ3JELE1BQU0sWUFBWSxHQUFH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