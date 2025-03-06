import { collect, aggregateReports } from './src';
const functions = require('@google-cloud/functions-framework');
const { PubSub } = require('@google-cloud/pubsub');


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

// async function scanUrl(url, customConfig) {
//     const defaultConfig = {
//         title: scannerConfig.title,
//         headless: scannerConfig.scanner.headless,
//         numPages: scannerConfig.scanner.numPages,
//         captureHar: scannerConfig.scanner.captureHar,
//         saveScreenshots: scannerConfig.scanner.saveScreenshots,
//         emulateDevice: scannerConfig.scanner.emulateDevice
//     };

//     const config = { ...defaultConfig, ...customConfig };
//     const formattedUrl = url.startsWith('http') ? url : `https://${url}`;

//     const result = await collect(formattedUrl, config);

//     if (result.status === 'success') {
//         console.log(`Scan successful: ${config.outDir}`);
//     } else {
//         console.error(`Scan failed: ${result.page_response}`);
//     }
// }

// async function main() {
//     // Set the number of concurrent scans
//     const maxConcurrent = scannerConfig.maxConcurrent;
//     let running = 0;
//     const queue = [...pagesToScan];

//     async function processNext() {
//         while (queue.length > 0 && running < maxConcurrent) {
//             const page = queue.shift();
//             running++;

//             // Use immediately invoked async function to handle each scan
//             (async () => {
//                 try {
//                     await scanUrl(page);
//                 } catch (error) {
//                     // if failed, try again
//                     await scanUrl(page);
//                 } finally {
//                     running--;
//                     // Try to process next item when this one is done
//                     processNext();
//                 }
//             })();
//         }
//     }

//     // Start the processing
//     await processNext();

//     // Wait until all scans are complete
//     while (running > 0) {
//         await new Promise(resolve => setTimeout(resolve, 1000));
//     }

//     await aggregateReports();
// }

exports.main = async (rawMessage, context) => {
    try {
        // Decode message
        const data = rawMessage.body.message.data ? Buffer.from(rawMessage.body.message.data, 'base64').toString() : '{}';
        const parsedData = JSON.parse(data);

        console.log('Received message:', parsedData.title);

        // // Process the data (Example: log user activity)
        // if (parsedData.event === 'user_signup') {
        //     console.log(`New user signed up: ${parsedData.user_id}`);
        // } else if (parsedData.event === 'purchase') {
        //     console.log(`User ${parsedData.user_id} made a purchase of $${parsedData.amount}`);
        // }

    } catch (error) {
        console.error('Error processing message:', error);
    }
};