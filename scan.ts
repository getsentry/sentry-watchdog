import { CollectorOptions, collect } from './src';
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

async function scanUrl(url: string, customConfig?: Partial<CollectorOptions>): Promise<void> {
    const defaultConfig: CollectorOptions = {
        title: 'Sentry Cookie Scanner',
        headless: true,
        numPages: 0,
        captureHar: false,
        saveScreenshots: false,
        emulateDevice: {
            viewport: {height: 1920, width: 1080},
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.3"
        },
        outDir: join(__dirname, 'scan_results', url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+$/g, '')),
        reportDir: join(__dirname, 'scan_reports'),
    };

    const config = { ...defaultConfig, ...customConfig };
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;

    console.log(`Beginning scan of ${url}`);

    const result = await collect(formattedUrl, config);

    if (result.status === 'success') {
        console.log(`Scan successful: ${config.outDir}`);
    } else {
        console.error(`Scan failed: ${result.page_response}`);
    }
}

interface TargetConfig {
    sitemaps?: string[];
    rss?: string[];
    pages?: string[];
}

// Read and parse the YAML file
const targetConfig = yaml.load(
    fs.readFileSync('./target.yml', 'utf8')
) as TargetConfig;

// Initialize with empty arrays if properties are missing
const sitemaps: string[] = targetConfig.sitemaps || [];
const rssFeed: string[] = targetConfig.rss || [];
const individualPages: string[] = targetConfig.pages || [];

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
    
    for (const page of pagesToScan) {
        scanUrl(page);
    }
}

main();