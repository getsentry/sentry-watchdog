import { CollectorOptions, collect, aggregateReports } from './src';
import { join } from 'path';
import axios from 'axios';
import * as xml2js from 'xml2js';
import Parser from 'rss-parser';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

async function getPagesFromSite(sitemaps: string[]): Promise<string[]> {
    const pagesToScan: string[] = [];
    for (const sitemapLink of sitemaps) {
        const response = await axios.get(sitemapLink);
        const result = await xml2js.parseStringPromise(response.data);
        
        if (result.urlset && result.urlset.url) {
            for (const page of result.urlset.url) {
                if (page.loc && page.loc.length > 0) {
                    pagesToScan.push(page.loc[0]);
                }
            }
        }
    }
    return pagesToScan;
}

async function getPagesFromFeed(feeds: string[]): Promise<string[]> {
    const pagesToScan: string[] = [];
    const parser = new Parser();
    
    for (const feedLink of feeds) {
        try {
            // First fetch the feed content using axios
            const response = await axios.get(feedLink);
            // Then parse the feed content
            const feed = await parser.parseString(response.data);
            
            for (const entry of feed.items) {
                if (entry.link) {
                    pagesToScan.push(entry.link);
                }
            }
        } catch (error) {
            console.error(`Error fetching/parsing feed ${feedLink}:`, error.message);
            // Continue with next feed if one fails
            continue;
        }
    }
    return pagesToScan;
}

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
    target_list: string;
    maxConcurrent: number;
}

interface TargetConfig {
    sitemaps?: string[];
    rss?: string[];
    pages?: string[];
}

// Read scanner config
const scannerConfig = yaml.load(
    fs.readFileSync('./scanner_config.yaml', 'utf8')
) as ScannerConfig;

// Read target config
const targetConfig = yaml.load(
    fs.readFileSync(scannerConfig.target_list, 'utf8')
) as TargetConfig;

// Initialize with empty arrays if properties are missing
const sitemaps: string[] = targetConfig.sitemaps || [];
const rssFeed: string[] = targetConfig.rss || [];
const individualPages: string[] = targetConfig.pages || [];

async function scanUrl(url: string, customConfig?: Partial<CollectorOptions>): Promise<void> {
    const defaultConfig: CollectorOptions = {
        title: scannerConfig.title,
        headless: scannerConfig.scanner.headless,
        numPages: scannerConfig.scanner.numPages,
        captureHar: scannerConfig.scanner.captureHar,
        saveScreenshots: scannerConfig.scanner.saveScreenshots,
        emulateDevice: scannerConfig.scanner.emulateDevice,
        outDir: join(__dirname, scannerConfig.output.outDir, url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+$/g, '')),
        reportDir: join(__dirname, scannerConfig.output.reportDir),
        extraPuppeteerOptions: {
            protocolTimeout: 60000  // Increase timeout to 60 seconds
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

async function main() {
    let pagesToScan: string[] = await getPagesFromSite(sitemaps);
    pagesToScan = pagesToScan.concat(await getPagesFromFeed(rssFeed));
    pagesToScan = pagesToScan.concat(individualPages);

    // Clear the scan directories before running the scan
    ['scan_results', 'scan_reports'].forEach(dir => {
        const path = join(__dirname, dir);
        if (fs.existsSync(path)) {
            fs.rmSync(path, { recursive: true, force: true });
        }
        fs.mkdirSync(path);
    });

    // Set the number of concurrent scans
    const maxConcurrent = scannerConfig.maxConcurrent;
    let running = 0;
    const queue = [...pagesToScan];

    async function processNext() {
        while (queue.length > 0 && running < maxConcurrent) {
            const page = queue.shift()!;
            running++;
            
            // Use immediately invoked async function to handle each scan
            (async () => {
                try {
                    await scanUrl(page);
                } catch (error) {
                    // if failed, try again
                    await scanUrl(page);
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

    await aggregateReports();
}

main();