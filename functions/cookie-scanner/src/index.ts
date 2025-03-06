import * as functions from '@google-cloud/functions-framework';

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

async function scanUrl(url, customConfig) {
    const defaultConfig = {
        title: scannerConfig.title,
        headless: scannerConfig.scanner.headless,
        numPages: scannerConfig.scanner.numPages,
        captureHar: scannerConfig.scanner.captureHar,
        saveScreenshots: scannerConfig.scanner.saveScreenshots,
        emulateDevice: scannerConfig.scanner.emulateDevice
    };

    const config = { ...defaultConfig, ...customConfig };
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;

    const result = await collect(formattedUrl, config);

    if (result.status === 'success') {
        console.log(`Scan successful: ${config.outDir}`);
    } else {
        console.error(`Scan failed: ${result.page_response}`);
    }
}

functions.http('main', async (rawMessage, res) => {
    try {
        // Decode message
        const data = rawMessage.body.message.data ? Buffer.from(rawMessage.body.message.data, 'base64').toString() : '{}';
        const parsedData = JSON.parse(data);

        console.log('Processing URL:', parsedData.url);

        // Configure collector options
        const options: CollectorOptions = {
            url: parsedData.url,
            // Add any other options your collector needs
        };

        // Run the collector
        const results = await collect(options);

        // Optionally aggregate reports if needed
        // const aggregatedResults = await aggregateReports(results);

        res.status(200).json({
            success: true,
            results
        });
    } catch (error) {
        console.error('Error processing URL:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
