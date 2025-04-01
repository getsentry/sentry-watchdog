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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collect = void 0;
const fs_1 = require("fs");
const lodash_samplesize_1 = __importDefault(require("lodash.samplesize"));
const os_1 = __importDefault(require("os"));
const path_1 = require("path");
const puppeteer_1 = __importStar(require("puppeteer"));
const puppeteer_har_1 = __importDefault(require("puppeteer-har"));
const tldts_1 = require("tldts");
const cookies_1 = require("./inspectors/cookies");
const logger_1 = require("./helpers/logger");
const parser_1 = require("./parser");
const default_1 = require("./pptr-utils/default");
const get_links_1 = require("./pptr-utils/get-links");
const interaction_utils_1 = require("./pptr-utils/interaction-utils");
// import { fillForms } from './pptr-utils/interaction-utils';
const inspector_1 = require("./inspectors/inspector");
const key_logging_1 = require("./inspectors/key-logging");
const session_recording_1 = require("./inspectors/session-recording");
const third_party_trackers_1 = require("./inspectors/third-party-trackers");
const utils_1 = require("./helpers/utils");
const chromium_1 = __importDefault(require("@sparticuz/chromium"));
const DEFAULT_OPTIONS = {
    outDir: (0, path_1.join)(process.cwd(), 'bl-tmp'),
    reportDir: (0, path_1.join)(process.cwd(), 'reports'),
    title: 'Blacklight Inspection',
    emulateDevice: puppeteer_1.KnownDevices['iPhone 13 Mini'],
    captureHar: false,
    captureLinks: false,
    enableAdBlock: false,
    clearCache: true,
    quiet: true,
    headless: true,
    defaultTimeout: 45000,
    numPages: 0,
    defaultWaitUntil: 'networkidle2',
    saveBrowserProfile: false,
    saveScreenshots: false,
    headers: {},
    blTests: [
        'behaviour_event_listeners',
        'canvas_fingerprinters',
        'canvas_font_fingerprinters',
        'cookies',
        'fb_pixel_events',
        'key_logging',
        'session_recorders',
        'third_party_trackers'
    ],
    puppeteerExecutablePath: null,
    extraChromiumArgs: ['--disable-features=TrackingProtection3pcd'],
    extraPuppeteerOptions: {}
};
const cleanupBeforeClose = async (page) => {
    try {
        // Clear all listeners
        await page.removeAllListeners();
        // Stop any media playback
        await page.evaluate(() => {
            document.querySelectorAll('video, audio').forEach((media) => {
                try {
                    media.pause();
                    media.remove();
                }
                catch (e) { }
            });
        });
        // Clear memory
        await page.evaluate(() => {
            if (window.gc) {
                window.gc();
            }
        });
    }
    catch (e) {
        // Ignore cleanup errors
    }
};
const collect = async (inUrl, args) => {
    args = { ...DEFAULT_OPTIONS, ...args };
    (0, utils_1.clearDir)(args.outDir);
    const FIRST_PARTY = (0, tldts_1.parse)(inUrl);
    let REDIRECTED_FIRST_PARTY = (0, tldts_1.parse)(inUrl);
    const logger = (0, logger_1.getLogger)({ outDir: args.outDir, quiet: args.quiet });
    const output = {
        title: args.title,
        uri_ins: inUrl,
        uri_dest: null,
        uri_redirects: null,
        secure_connection: {},
        host: new URL(inUrl).hostname,
        config: {
            emulateDevice: args.emulateDevice,
            cleareCache: args.clearCache,
            captureHar: args.captureHar,
            captureLinks: args.captureLinks,
            enableAdBlock: args.enableAdBlock,
            saveBrowserProfile: args.saveBrowserProfile,
            numPages: args.numPages,
            defaultTimeout: args.defaultTimeout,
            defaultWaitUntil: args.defaultWaitUntil,
            headless: args.headless,
            headers: args.headers,
            extraChromiumArgs: args.extraChromiumArgs,
            extraPuppeteerOptions: args.extraPuppeteerOptions
        },
        browser: null,
        script: {
            host: os_1.default.hostname(),
            version: {
                npm: require('../package.json').version,
                commit: require('../.commit-hash.cjs')
            },
            node_version: process.version
        },
        start_time: new Date(),
        end_time: null
    };
    // Log network requests and page links
    const hosts = {
        requests: {
            first_party: new Set(),
            third_party: new Set()
        },
        links: {
            first_party: new Set(),
            third_party: new Set()
        }
    };
    let browser;
    let page;
    let pageIndex = 1;
    let har = {};
    let page_response = null;
    const userDataDir = args.saveBrowserProfile ? (0, path_1.join)(args.outDir, 'browser-profile') : undefined;
    let didBrowserDisconnect = false;
    const options = {
        ...default_1.defaultPuppeteerBrowserOptions,
        args: [
            ...chromium_1.default.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            `--user-agent=${args.emulateDevice.userAgent}`,
            ...args.extraChromiumArgs
        ],
        defaultViewport: {
            width: args.emulateDevice.viewport.width,
            height: args.emulateDevice.viewport.height
        },
        executablePath: await chromium_1.default.executablePath(),
        headless: chromium_1.default.headless,
        ignoreHTTPSErrors: true,
        userDataDir
    };
    try {
        browser = await puppeteer_1.default.launch(options);
        browser.on('disconnected', () => {
            didBrowserDisconnect = true;
            // Attempt cleanup of any remaining processes
            try {
                if (browser.process()) {
                    browser.process()?.kill('SIGKILL');
                }
            }
            catch (e) {
                // Ignore cleanup errors
            }
        });
        if (didBrowserDisconnect) {
            return {
                status: 'failed',
                page_response: 'Chrome crashed'
            };
        }
        logger.info(`Started Puppeteer with pid ${browser.process().pid}`);
        page = (await browser.pages())[0];
        output.browser = {
            name: 'Chromium',
            version: await browser.version(),
            user_agent: await browser.userAgent(),
            platform: {
                name: os_1.default.type(),
                version: os_1.default.release()
            }
        };
        page.emulate(args.emulateDevice);
        if (Object.keys(args.headers).length > 0) {
            page.setExtraHTTPHeaders(args.headers);
        }
        // record all requested hosts
        page.on('request', request => {
            const l = (0, tldts_1.parse)(request.url());
            // note that hosts may appear as first and third party depending on the path
            if (FIRST_PARTY.domain === l.domain) {
                hosts.requests.first_party.add(l.hostname);
            }
            else {
                if (request.url().indexOf('data://') < 1 && !!l.hostname) {
                    hosts.requests.third_party.add(l.hostname);
                }
            }
        });
        if (args.clearCache) {
            await (0, cookies_1.clearCookiesCache)(page);
        }
        // Init blacklight instruments on page
        await (0, inspector_1.setupBlacklightInspector)(page, logger.warn);
        await (0, key_logging_1.setupKeyLoggingInspector)(page, logger.warn);
        await (0, cookies_1.setupHttpCookieCapture)(page, logger.warn);
        await (0, session_recording_1.setupSessionRecordingInspector)(page, logger.warn);
        await (0, third_party_trackers_1.setUpThirdPartyTrackersInspector)(page, logger.warn, args.enableAdBlock);
        if (args.captureHar) {
            har = new puppeteer_har_1.default(page);
            await har.start({
                path: args.outDir ? (0, path_1.join)(args.outDir, 'requests.har') : undefined
            });
        }
        if (didBrowserDisconnect) {
            return {
                status: 'failed',
                page_response: 'Chrome crashed'
            };
        }
        // Function to navigate to a page with a timeout guard
        const navigateWithTimeout = async (page, url, timeout, waitUntil) => {
            try {
                page_response = await page.goto(url, {
                    waitUntil: waitUntil,
                    timeout: timeout
                });
            }
            catch (error) {
                page_response = await page.goto(url, {
                    timeout: timeout,
                    waitUntil: 'domcontentloaded'
                });
            }
            // Wait for network to be idle and additional time for dynamic content
            await page.waitForNavigation({ waitUntil: waitUntil, timeout: 30000 }).catch(() => { });
            await new Promise(resolve => setTimeout(resolve, 30000));
            await (0, default_1.savePageContent)(pageIndex, args.outDir, page, args.saveScreenshots);
        };
        // Go to the first url
        // console.log('Going to the first url', inUrl);
        await navigateWithTimeout(page, inUrl, args.defaultTimeout, args.defaultWaitUntil);
        pageIndex++;
        // console.log('Saving first page response');
        let duplicatedLinks = [];
        const outputLinks = {
            first_party: [],
            third_party: []
        };
        output.uri_redirects = page_response
            .request()
            .redirectChain()
            .map(req => {
            return req.url();
        });
        output.uri_dest = page.url();
        duplicatedLinks = await (0, get_links_1.getLinks)(page);
        REDIRECTED_FIRST_PARTY = (0, tldts_1.parse)(output.uri_dest);
        for (const link of (0, get_links_1.dedupLinks)(duplicatedLinks)) {
            const l = (0, tldts_1.parse)(link.href);
            if (REDIRECTED_FIRST_PARTY.domain === l.domain) {
                outputLinks.first_party.push(link);
                hosts.links.first_party.add(l.hostname);
            }
            else {
                if (l.hostname && l.hostname !== 'data') {
                    outputLinks.third_party.push(link);
                    hosts.links.third_party.add(l.hostname);
                }
            }
        }
        // await fillForms(page);
        // console.log('... done with fillForms');
        await (0, interaction_utils_1.autoScroll)(page);
        let subDomainLinks = [];
        if ((0, tldts_1.getSubdomain)(output.uri_dest) !== 'www') {
            subDomainLinks = outputLinks.first_party.filter(f => {
                return (0, tldts_1.getSubdomain)(f.href) === (0, tldts_1.getSubdomain)(output.uri_dest);
            });
        }
        else {
            subDomainLinks = outputLinks.first_party;
        }
        const browse_links = (0, lodash_samplesize_1.default)(subDomainLinks, args.numPages);
        output.browsing_history = [output.uri_dest].concat(browse_links.map(l => l.href));
        // console.log('About to browse more links');
        for (const link of output.browsing_history.slice(1)) {
            logger.log('info', `browsing now to ${link}`, { type: 'Browser' });
            if (didBrowserDisconnect) {
                return {
                    status: 'failed',
                    page_response: 'Chrome crashed'
                };
            }
            if (args.clearCache) {
                await (0, cookies_1.clearCookiesCache)(page);
            }
            // console.log(`Browsing now to ${link}`);
            await navigateWithTimeout(page, link, args.defaultTimeout, args.defaultWaitUntil);
            // await fillForms(page);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
            duplicatedLinks = duplicatedLinks.concat(await (0, get_links_1.getLinks)(page));
            await (0, interaction_utils_1.autoScroll)(page);
            pageIndex++;
        }
        await (0, cookies_1.captureBrowserCookies)(page, args.outDir);
        if (args.captureHar) {
            await har.stop();
        }
        const pages = await browser.pages();
        await Promise.all(pages.map(cleanupBeforeClose));
        await (0, utils_1.closeBrowser)(browser);
        if (typeof userDataDir !== 'undefined') {
            (0, utils_1.clearDir)(userDataDir, false);
        }
        const links = (0, get_links_1.dedupLinks)(duplicatedLinks);
        output.end_time = new Date();
        for (const link of links) {
            const l = (0, tldts_1.parse)(link.href);
            if (REDIRECTED_FIRST_PARTY.domain === l.domain) {
                outputLinks.first_party.push(link);
                hosts.links.first_party.add(l.hostname);
            }
            else {
                if (l.hostname && l.hostname !== 'data') {
                    outputLinks.third_party.push(link);
                    hosts.links.third_party.add(l.hostname);
                }
            }
        }
        // generate report
        const fpRequests = Array.from(hosts.requests.first_party);
        const tpRequests = Array.from(hosts.requests.third_party);
        const incorrectTpAssignment = tpRequests.filter((f) => (0, tldts_1.getDomain)(f) === REDIRECTED_FIRST_PARTY.domain);
        output.hosts = {
            requests: {
                first_party: fpRequests.concat(incorrectTpAssignment),
                third_party: tpRequests.filter(t => !incorrectTpAssignment.includes(t))
            }
        };
        if (args.captureLinks) {
            output.links = outputLinks;
            output.social = (0, get_links_1.getSocialLinks)(links);
        }
        const event_data_all = await new Promise(done => {
            logger.query({
                start: 0,
                order: 'desc',
                limit: Infinity,
                fields: ['message']
            }, (err, results) => {
                if (err) {
                    console.log(`Couldnt load event data ${JSON.stringify(err)}`);
                    return done([]);
                }
                return done(results.file);
            });
        });
        if (!Array.isArray(event_data_all)) {
            return {
                status: 'failed',
                page_response: 'Couldnt load event data'
            };
        }
        if (event_data_all.length < 1) {
            return {
                status: 'failed',
                page_response: 'Couldnt load event data'
            };
        }
        // filter only events with type set
        const event_data = event_data_all.filter(event => {
            return !!event.message.type;
        });
        // We only consider something to be a third party tracker if:
        // The domain is different to that of the final url (after any redirection) of the page the user requested to load.
        const reports = args.blTests.reduce((acc, cur) => {
            acc[cur] = (0, parser_1.generateReport)(cur, event_data, args.outDir, REDIRECTED_FIRST_PARTY.domain);
            return acc;
        }, {});
        const json_dump = JSON.stringify({ ...output, reports }, null, 2);
        (0, fs_1.writeFileSync)((0, path_1.join)(args.outDir, 'inspection.json'), json_dump);
        if (args.outDir.includes('bl-tmp')) {
            (0, utils_1.clearDir)(args.outDir, false);
        }
        // also save the reports to the report directory
        const report_name = inUrl
            .replace(/^https?:\/\//, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+$/g, '');
        (0, fs_1.writeFileSync)((0, path_1.join)(args.reportDir, `${report_name}.json`), json_dump);
        return {
            status: 'success',
            ...output,
            reports,
        };
    }
    finally {
        if (browser && !didBrowserDisconnect) {
            const pages = await browser.pages();
            await Promise.all(pages.map(cleanupBeforeClose));
            await (0, utils_1.closeBrowser)(browser);
        }
    }
};
exports.collect = collect;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29sbGVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkJBQW1DO0FBQ25DLDBFQUEyQztBQUMzQyw0Q0FBb0I7QUFDcEIsK0JBQTRCO0FBQzVCLHVEQUFvSDtBQUNwSCxrRUFBeUM7QUFDekMsaUNBQXVEO0FBQ3ZELGtEQUF3RztBQUV4Ryw2Q0FBNkM7QUFDN0MscUNBQTBDO0FBQzFDLGtEQUF1RjtBQUN2RixzREFBOEU7QUFDOUUsc0VBQTREO0FBQzVELDhEQUE4RDtBQUM5RCxzREFBa0U7QUFDbEUsMERBQW9FO0FBQ3BFLHNFQUFnRjtBQUNoRiw0RUFBcUY7QUFDckYsMkNBQXlEO0FBRXpELG1FQUEyQztBQUkzQyxNQUFNLGVBQWUsR0FBRztJQUNwQixNQUFNLEVBQUUsSUFBQSxXQUFJLEVBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLFFBQVEsQ0FBQztJQUNyQyxTQUFTLEVBQUUsSUFBQSxXQUFJLEVBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLFNBQVMsQ0FBQztJQUN6QyxLQUFLLEVBQUUsdUJBQXVCO0lBQzlCLGFBQWEsRUFBRSx3QkFBWSxDQUFDLGdCQUFnQixDQUFDO0lBQzdDLFVBQVUsRUFBRSxLQUFLO0lBQ2pCLFlBQVksRUFBRSxLQUFLO0lBQ25CLGFBQWEsRUFBRSxLQUFLO0lBQ3BCLFVBQVUsRUFBRSxJQUFJO0lBQ2hCLEtBQUssRUFBRSxJQUFJO0lBQ1gsUUFBUSxFQUFFLElBQUk7SUFDZCxjQUFjLEVBQUUsS0FBSztJQUNyQixRQUFRLEVBQUUsQ0FBQztJQUNYLGdCQUFnQixFQUFFLGNBQXlDO0lBQzNELGtCQUFrQixFQUFFLEtBQUs7SUFDekIsZUFBZSxFQUFFLEtBQUs7SUFDdEIsT0FBTyxFQUFFLEVBQUU7SUFDWCxPQUFPLEVBQUU7UUFDTCwyQkFBMkI7UUFDM0IsdUJBQXVCO1FBQ3ZCLDRCQUE0QjtRQUM1QixTQUFTO1FBQ1QsaUJBQWlCO1FBQ2pCLGFBQWE7UUFDYixtQkFBbUI7UUFDbkIsc0JBQXNCO0tBQ3pCO0lBQ0QsdUJBQXVCLEVBQUUsSUFBcUI7SUFDOUMsaUJBQWlCLEVBQUUsQ0FBQywyQ0FBMkMsQ0FBYTtJQUM1RSxxQkFBcUIsRUFBRSxFQUFxQztDQUMvRCxDQUFDO0FBRUYsTUFBTSxrQkFBa0IsR0FBRyxLQUFLLEVBQUUsSUFBVSxFQUFFLEVBQUU7SUFDNUMsSUFBSTtRQUNBLHNCQUFzQjtRQUN0QixNQUFNLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBRWhDLDBCQUEwQjtRQUMxQixNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO1lBQ3JCLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUF1QixFQUFFLEVBQUU7Z0JBQzFFLElBQUk7b0JBQ0EsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUNkLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztpQkFDbEI7Z0JBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRTtZQUNsQixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO1FBRUgsZUFBZTtRQUNmLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7WUFDckIsSUFBSSxNQUFNLENBQUMsRUFBRSxFQUFFO2dCQUNYLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQzthQUNmO1FBQ0wsQ0FBQyxDQUFDLENBQUM7S0FDTjtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1Isd0JBQXdCO0tBQzNCO0FBQ0wsQ0FBQyxDQUFDO0FBRUssTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQWEsRUFBRSxJQUFzQixFQUFFLEVBQUU7SUFDbkUsSUFBSSxHQUFHLEVBQUUsR0FBRyxlQUFlLEVBQUUsR0FBRyxJQUFJLEVBQUUsQ0FBQztJQUN2QyxJQUFBLGdCQUFRLEVBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RCLE1BQU0sV0FBVyxHQUFHLElBQUEsYUFBSyxFQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2pDLElBQUksc0JBQXNCLEdBQUcsSUFBQSxhQUFLLEVBQUMsS0FBSyxDQUFDLENBQUM7SUFDMUMsTUFBTSxNQUFNLEdBQUcsSUFBQSxrQkFBUyxFQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBRXJFLE1BQU0sTUFBTSxHQUFRO1FBQ2hCLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztRQUNqQixPQUFPLEVBQUUsS0FBSztRQUNkLFFBQVEsRUFBRSxJQUFJO1FBQ2QsYUFBYSxFQUFFLElBQUk7UUFDbkIsaUJBQWlCLEVBQUUsRUFBRTtRQUNyQixJQUFJLEVBQUUsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUTtRQUM3QixNQUFNLEVBQUU7WUFDSixhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWE7WUFDakMsV0FBVyxFQUFFLElBQUksQ0FBQyxVQUFVO1lBQzVCLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtZQUMzQixZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVk7WUFDL0IsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhO1lBQ2pDLGtCQUFrQixFQUFFLElBQUksQ0FBQyxrQkFBa0I7WUFDM0MsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO1lBQ3ZCLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYztZQUNuQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsZ0JBQWdCO1lBQ3ZDLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtZQUN2QixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87WUFDckIsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQjtZQUN6QyxxQkFBcUIsRUFBRSxJQUFJLENBQUMscUJBQXFCO1NBQ3BEO1FBQ0QsT0FBTyxFQUFFLElBQUk7UUFDYixNQUFNLEVBQUU7WUFDSixJQUFJLEVBQUUsWUFBRSxDQUFDLFFBQVEsRUFBRTtZQUNuQixPQUFPLEVBQUU7Z0JBQ0wsR0FBRyxFQUFFLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLE9BQU87Z0JBQ3ZDLE1BQU0sRUFBRSxPQUFPLENBQUMscUJBQXFCLENBQUM7YUFDekM7WUFDRCxZQUFZLEVBQUUsT0FBTyxDQUFDLE9BQU87U0FDaEM7UUFDRCxVQUFVLEVBQUUsSUFBSSxJQUFJLEVBQUU7UUFDdEIsUUFBUSxFQUFFLElBQUk7S0FDakIsQ0FBQztJQUVGLHNDQUFzQztJQUN0QyxNQUFNLEtBQUssR0FBRztRQUNWLFFBQVEsRUFBRTtZQUNOLFdBQVcsRUFBRSxJQUFJLEdBQUcsRUFBRTtZQUN0QixXQUFXLEVBQUUsSUFBSSxHQUFHLEVBQUU7U0FDekI7UUFDRCxLQUFLLEVBQUU7WUFDSCxXQUFXLEVBQUUsSUFBSSxHQUFHLEVBQUU7WUFDdEIsV0FBVyxFQUFFLElBQUksR0FBRyxFQUFFO1NBQ3pCO0tBQ0osQ0FBQztJQUVGLElBQUksT0FBZ0IsQ0FBQztJQUNyQixJQUFJLElBQVUsQ0FBQztJQUNmLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztJQUNsQixJQUFJLEdBQUcsR0FBRyxFQUFTLENBQUM7SUFDcEIsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDO0lBQ3pCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsSUFBQSxXQUFJLEVBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFDL0YsSUFBSSxvQkFBb0IsR0FBRyxLQUFLLENBQUM7SUFFakMsTUFBTSxPQUFPLEdBQUc7UUFDWixHQUFHLHdDQUE4QjtRQUNqQyxJQUFJLEVBQUU7WUFDRixHQUFHLGtCQUFRLENBQUMsSUFBSTtZQUNoQixjQUFjO1lBQ2QsMEJBQTBCO1lBQzFCLGdCQUFnQixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRTtZQUM5QyxHQUFHLElBQUksQ0FBQyxpQkFBaUI7U0FDNUI7UUFDRCxlQUFlLEVBQUU7WUFDYixLQUFLLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsS0FBSztZQUN4QyxNQUFNLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsTUFBTTtTQUM3QztRQUNELGNBQWMsRUFBRSxNQUFNLGtCQUFRLENBQUMsY0FBYyxFQUFFO1FBQy9DLFFBQVEsRUFBRSxrQkFBUSxDQUFDLFFBQVE7UUFDM0IsaUJBQWlCLEVBQUUsSUFBSTtRQUN2QixXQUFXO0tBQ2QsQ0FBQztJQUNGLElBQUk7UUFDQSxPQUFPLEdBQUcsTUFBTSxtQkFBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMxQyxPQUFPLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7WUFDNUIsb0JBQW9CLEdBQUcsSUFBSSxDQUFDO1lBQzVCLDZDQUE2QztZQUM3QyxJQUFJO2dCQUNBLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFO29CQUNuQixPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2lCQUN0QzthQUNKO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1Isd0JBQXdCO2FBQzNCO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLG9CQUFvQixFQUFFO1lBQ3RCLE9BQU87Z0JBQ0gsTUFBTSxFQUFFLFFBQVE7Z0JBQ2hCLGFBQWEsRUFBRSxnQkFBZ0I7YUFDbEMsQ0FBQztTQUNMO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyw4QkFBOEIsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDbkUsSUFBSSxHQUFHLENBQUMsTUFBTSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsT0FBTyxHQUFHO1lBQ2IsSUFBSSxFQUFFLFVBQVU7WUFDaEIsT0FBTyxFQUFFLE1BQU0sT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUNoQyxVQUFVLEVBQUUsTUFBTSxPQUFPLENBQUMsU0FBUyxFQUFFO1lBQ3JDLFFBQVEsRUFBRTtnQkFDTixJQUFJLEVBQUUsWUFBRSxDQUFDLElBQUksRUFBRTtnQkFDZixPQUFPLEVBQUUsWUFBRSxDQUFDLE9BQU8sRUFBRTthQUN4QjtTQUNKLENBQUM7UUFDRixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUVqQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDdEMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUMxQztRQUVELDZCQUE2QjtRQUM3QixJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsRUFBRTtZQUN6QixNQUFNLENBQUMsR0FBRyxJQUFBLGFBQUssRUFBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUMvQiw0RUFBNEU7WUFDNUUsSUFBSSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQUU7Z0JBQ2pDLEtBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDOUM7aUJBQU07Z0JBQ0gsSUFBSSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRTtvQkFDdEQsS0FBSyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztpQkFDOUM7YUFDSjtRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ2pCLE1BQU0sSUFBQSwyQkFBaUIsRUFBQyxJQUFJLENBQUMsQ0FBQztTQUNqQztRQUVELHNDQUFzQztRQUN0QyxNQUFNLElBQUEsb0NBQXdCLEVBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsRCxNQUFNLElBQUEsc0NBQXdCLEVBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsRCxNQUFNLElBQUEsZ0NBQXNCLEVBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoRCxNQUFNLElBQUEsa0RBQThCLEVBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4RCxNQUFNLElBQUEsdURBQWdDLEVBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRTlFLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtZQUNqQixHQUFHLEdBQUcsSUFBSSx1QkFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdCLE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQztnQkFDWixJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBQSxXQUFJLEVBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUzthQUNwRSxDQUFDLENBQUM7U0FDTjtRQUNELElBQUksb0JBQW9CLEVBQUU7WUFDdEIsT0FBTztnQkFDSCxNQUFNLEVBQUUsUUFBUTtnQkFDaEIsYUFBYSxFQUFFLGdCQUFnQjthQUNsQyxDQUFDO1NBQ0w7UUFFRCxzREFBc0Q7UUFDdEQsTUFBTSxtQkFBbUIsR0FBRyxLQUFLLEVBQUUsSUFBVSxFQUFFLEdBQVcsRUFBRSxPQUFlLEVBQUUsU0FBa0MsRUFBRSxFQUFFO1lBQy9HLElBQUk7Z0JBQ0EsYUFBYSxHQUFHLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUU7b0JBQ2pDLFNBQVMsRUFBRSxTQUFTO29CQUNwQixPQUFPLEVBQUUsT0FBTztpQkFDbkIsQ0FBQyxDQUFDO2FBQ047WUFBQyxPQUFPLEtBQUssRUFBRTtnQkFDWixhQUFhLEdBQUcsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtvQkFDakMsT0FBTyxFQUFFLE9BQU87b0JBQ2hCLFNBQVMsRUFBRSxrQkFBNkM7aUJBQzNELENBQUMsQ0FBQzthQUNOO1lBQ0Qsc0VBQXNFO1lBQ3RFLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUM7WUFDdkYsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN6RCxNQUFNLElBQUEseUJBQWUsRUFBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQzlFLENBQUMsQ0FBQztRQUVGLHNCQUFzQjtRQUN0QixnREFBZ0Q7UUFDaEQsTUFBTSxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGdCQUEyQyxDQUFDLENBQUM7UUFFOUcsU0FBUyxFQUFFLENBQUM7UUFDWiw2Q0FBNkM7UUFFN0MsSUFBSSxlQUFlLEdBQUcsRUFBRSxDQUFDO1FBQ3pCLE1BQU0sV0FBVyxHQUFHO1lBQ2hCLFdBQVcsRUFBRSxFQUFFO1lBQ2YsV0FBVyxFQUFFLEVBQUU7U0FDbEIsQ0FBQztRQUVGLE1BQU0sQ0FBQyxhQUFhLEdBQUcsYUFBYTthQUMvQixPQUFPLEVBQUU7YUFDVCxhQUFhLEVBQUU7YUFDZixHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDUCxPQUFPLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNyQixDQUFDLENBQUMsQ0FBQztRQUVQLE1BQU0sQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzdCLGVBQWUsR0FBRyxNQUFNLElBQUEsb0JBQVEsRUFBQyxJQUFJLENBQUMsQ0FBQztRQUN2QyxzQkFBc0IsR0FBRyxJQUFBLGFBQUssRUFBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDaEQsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFBLHNCQUFVLEVBQUMsZUFBZSxDQUFDLEVBQUU7WUFDNUMsTUFBTSxDQUFDLEdBQUcsSUFBQSxhQUFLLEVBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRTNCLElBQUksc0JBQXNCLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQUU7Z0JBQzVDLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNuQyxLQUFLLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQzNDO2lCQUFNO2dCQUNILElBQUksQ0FBQyxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsUUFBUSxLQUFLLE1BQU0sRUFBRTtvQkFDckMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ25DLEtBQUssQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7aUJBQzNDO2FBQ0o7U0FDSjtRQUNELHlCQUF5QjtRQUN6QiwwQ0FBMEM7UUFDMUMsTUFBTSxJQUFBLDhCQUFVLEVBQUMsSUFBSSxDQUFDLENBQUM7UUFFdkIsSUFBSSxjQUFjLEdBQUcsRUFBRSxDQUFDO1FBQ3hCLElBQUksSUFBQSxvQkFBWSxFQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxLQUFLLEVBQUU7WUFDekMsY0FBYyxHQUFHLFdBQVcsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNoRCxPQUFPLElBQUEsb0JBQVksRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBQSxvQkFBWSxFQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsRSxDQUFDLENBQUMsQ0FBQztTQUNOO2FBQU07WUFDSCxjQUFjLEdBQUcsV0FBVyxDQUFDLFdBQVcsQ0FBQztTQUM1QztRQUNELE1BQU0sWUFBWSxHQUFHLElBQUEsMkJBQVUsRUFBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQy9ELE1BQU0sQ0FBQyxnQkFBZ0IsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2xGLDZDQUE2QztRQUU3QyxLQUFLLE1BQU0sSUFBSSxJQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDakQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsbUJBQW1CLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7WUFDbkUsSUFBSSxvQkFBb0IsRUFBRTtnQkFDdEIsT0FBTztvQkFDSCxNQUFNLEVBQUUsUUFBUTtvQkFDaEIsYUFBYSxFQUFFLGdCQUFnQjtpQkFDbEMsQ0FBQzthQUNMO1lBQ0QsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO2dCQUNqQixNQUFNLElBQUEsMkJBQWlCLEVBQUMsSUFBSSxDQUFDLENBQUM7YUFDakM7WUFDRCwwQ0FBMEM7WUFFMUMsTUFBTSxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLGdCQUEyQyxDQUFDLENBQUM7WUFFN0cseUJBQXlCO1lBRXpCLE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBb0I7WUFFN0UsZUFBZSxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUMsTUFBTSxJQUFBLG9CQUFRLEVBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUMvRCxNQUFNLElBQUEsOEJBQVUsRUFBQyxJQUFJLENBQUMsQ0FBQztZQUV2QixTQUFTLEVBQUUsQ0FBQztTQUNmO1FBRUQsTUFBTSxJQUFBLCtCQUFxQixFQUFDLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDL0MsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ2pCLE1BQU0sR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO1NBQ3BCO1FBRUQsTUFBTSxLQUFLLEdBQUcsTUFBTSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDcEMsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sSUFBQSxvQkFBWSxFQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVCLElBQUksT0FBTyxXQUFXLEtBQUssV0FBVyxFQUFFO1lBQ3BDLElBQUEsZ0JBQVEsRUFBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDaEM7UUFFRCxNQUFNLEtBQUssR0FBRyxJQUFBLHNCQUFVLEVBQUMsZUFBZSxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLFFBQVEsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQzdCLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1lBQ3RCLE1BQU0sQ0FBQyxHQUFHLElBQUEsYUFBSyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUUzQixJQUFJLHNCQUFzQixDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsTUFBTSxFQUFFO2dCQUM1QyxXQUFXLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbkMsS0FBSyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUMzQztpQkFBTTtnQkFDSCxJQUFJLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLFFBQVEsS0FBSyxNQUFNLEVBQUU7b0JBQ3JDLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNuQyxLQUFLLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUMzQzthQUNKO1NBQ0o7UUFFRCxrQkFBa0I7UUFDbEIsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzFELE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMxRCxNQUFNLHFCQUFxQixHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLElBQUEsaUJBQVMsRUFBQyxDQUFDLENBQUMsS0FBSyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMvRyxNQUFNLENBQUMsS0FBSyxHQUFHO1lBQ1gsUUFBUSxFQUFFO2dCQUNOLFdBQVcsRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDO2dCQUNyRCxXQUFXLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzFFO1NBQ0osQ0FBQztRQUVGLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRTtZQUNuQixNQUFNLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQztZQUMzQixNQUFNLENBQUMsTUFBTSxHQUFHLElBQUEsMEJBQWMsRUFBQyxLQUFLLENBQUMsQ0FBQztTQUN6QztRQUVELE1BQU0sY0FBYyxHQUFHLE1BQU0sSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDNUMsTUFBTSxDQUFDLEtBQUssQ0FDUjtnQkFDSSxLQUFLLEVBQUUsQ0FBQztnQkFDUixLQUFLLEVBQUUsTUFBTTtnQkFDYixLQUFLLEVBQUUsUUFBUTtnQkFDZixNQUFNLEVBQUUsQ0FBQyxTQUFTLENBQUM7YUFDdEIsRUFDRCxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTtnQkFDYixJQUFJLEdBQUcsRUFBRTtvQkFDTCxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDOUQsT0FBTyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7aUJBQ25CO2dCQUVELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM5QixDQUFDLENBQ0osQ0FBQztRQUNOLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUU7WUFDaEMsT0FBTztnQkFDSCxNQUFNLEVBQUUsUUFBUTtnQkFDaEIsYUFBYSxFQUFFLHlCQUF5QjthQUMzQyxDQUFDO1NBQ0w7UUFDRCxJQUFJLGNBQWMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQzNCLE9BQU87Z0JBQ0gsTUFBTSxFQUFFLFFBQVE7Z0JBQ2hCLGFBQWEsRUFBRSx5QkFBeUI7YUFDM0MsQ0FBQztTQUNMO1FBRUQsbUNBQW1DO1FBQ25DLE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDN0MsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFDaEMsQ0FBQyxDQUFDLENBQUM7UUFDSCw2REFBNkQ7UUFDN0QsbUhBQW1IO1FBQ25ILE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQzdDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFBLHVCQUFjLEVBQUMsR0FBRyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZGLE9BQU8sR0FBRyxDQUFDO1FBQ2YsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRVAsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRSxJQUFBLGtCQUFhLEVBQUMsSUFBQSxXQUFJLEVBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQy9ELElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDaEMsSUFBQSxnQkFBUSxFQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDaEM7UUFDRCxnREFBZ0Q7UUFDaEQsTUFBTSxXQUFXLEdBQUcsS0FBSzthQUNwQixPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQzthQUMzQixPQUFPLENBQUMsZUFBZSxFQUFFLEdBQUcsQ0FBQzthQUM3QixPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3pCLElBQUEsa0JBQWEsRUFBQyxJQUFBLFdBQUksRUFBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsV0FBVyxPQUFPLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN0RSxPQUFPO1lBQ0gsTUFBTSxFQUFFLFNBQVM7WUFDakIsR0FBRyxNQUFNO1lBQ1QsT0FBTztTQUNWLENBQUM7S0FDTDtZQUFTO1FBQ04sSUFBSSxPQUFPLElBQUksQ0FBQyxvQkFBb0IsRUFBRTtZQUNsQyxNQUFNLEtBQUssR0FBRyxNQUFNLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNwQyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7WUFDakQsTUFBTSxJQUFBLG9CQUFZLEVBQUMsT0FBTyxDQUFDLENBQUM7U0FDL0I7S0FDSjtBQUNMLENBQUMsQ0FBQztBQXhXVyxRQUFBLE9BQU8sV0F3V2xCIn0=