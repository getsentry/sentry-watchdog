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
    const userDataDir = args.saveBrowserProfile ? (0, utils_1.safePath)(args.outDir, 'browser-profile') : undefined;
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
                path: args.outDir ? (0, utils_1.safePath)(args.outDir, 'requests.har') : undefined
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
        (0, fs_1.writeFileSync)((0, utils_1.safePath)(args.outDir, 'inspection.json'), json_dump);
        if (args.outDir.includes('bl-tmp')) {
            (0, utils_1.clearDir)(args.outDir, false);
        }
        const report_name = (0, utils_1.urlToSafeFilename)(inUrl);
        (0, fs_1.writeFileSync)((0, utils_1.safePath)(args.reportDir, `${report_name}.json`), json_dump);
        return {
            status: 'success',
            ...output,
            reports
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29sbGVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJCQUFtQztBQUNuQywwRUFBMkM7QUFDM0MsNENBQW9CO0FBQ3BCLCtCQUE0QjtBQUM1Qix1REFBb0g7QUFDcEgsa0VBQXlDO0FBQ3pDLGlDQUF1RDtBQUN2RCxrREFBd0c7QUFFeEcsNkNBQTZDO0FBQzdDLHFDQUEwQztBQUMxQyxrREFBdUY7QUFDdkYsc0RBQThFO0FBQzlFLHNFQUE0RDtBQUM1RCw4REFBOEQ7QUFDOUQsc0RBQWtFO0FBQ2xFLDBEQUFvRTtBQUNwRSxzRUFBZ0Y7QUFDaEYsNEVBQXFGO0FBQ3JGLDJDQUFzRjtBQUV0RixtRUFBMkM7QUFJM0MsTUFBTSxlQUFlLEdBQUc7SUFDcEIsTUFBTSxFQUFFLElBQUEsV0FBSSxFQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxRQUFRLENBQUM7SUFDckMsU0FBUyxFQUFFLElBQUEsV0FBSSxFQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxTQUFTLENBQUM7SUFDekMsS0FBSyxFQUFFLHVCQUF1QjtJQUM5QixhQUFhLEVBQUUsd0JBQVksQ0FBQyxnQkFBZ0IsQ0FBQztJQUM3QyxVQUFVLEVBQUUsS0FBSztJQUNqQixZQUFZLEVBQUUsS0FBSztJQUNuQixhQUFhLEVBQUUsS0FBSztJQUNwQixVQUFVLEVBQUUsSUFBSTtJQUNoQixLQUFLLEVBQUUsSUFBSTtJQUNYLFFBQVEsRUFBRSxJQUFJO0lBQ2QsY0FBYyxFQUFFLEtBQUs7SUFDckIsUUFBUSxFQUFFLENBQUM7SUFDWCxnQkFBZ0IsRUFBRSxjQUF5QztJQUMzRCxrQkFBa0IsRUFBRSxLQUFLO0lBQ3pCLGVBQWUsRUFBRSxLQUFLO0lBQ3RCLE9BQU8sRUFBRSxFQUFFO0lBQ1gsT0FBTyxFQUFFO1FBQ0wsMkJBQTJCO1FBQzNC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