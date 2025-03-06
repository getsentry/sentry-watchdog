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
const cookie_collector_1 = require("./cookie-collector");
const logger_1 = require("./logger");
const parser_1 = require("./parser");
const default_1 = require("./pptr-utils/default");
const get_links_1 = require("./pptr-utils/get-links");
const interaction_utils_1 = require("./pptr-utils/interaction-utils");
const inspector_1 = require("./inspectors/inspector");
const key_logging_1 = require("./inspectors/key-logging");
const session_recording_1 = require("./inspectors/session-recording");
const third_party_trackers_1 = require("./inspectors/third-party-trackers");
const utils_1 = require("./utils");
const DEFAULT_OPTIONS = {
    outDir: (0, path_1.join)(process.cwd(), 'bl-tmp'),
    reportDir: (0, path_1.join)(process.cwd(), 'reports'),
    title: 'Blacklight Inspection',
    emulateDevice: puppeteer_1.KnownDevices['iPhone 13 Mini'],
    captureHar: true,
    captureLinks: false,
    enableAdBlock: false,
    clearCache: true,
    quiet: true,
    headless: true,
    defaultTimeout: 35000,
    numPages: 3,
    defaultWaitUntil: 'networkidle2',
    saveBrowserProfile: false,
    saveScreenshots: true,
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
    extraChromiumArgs: [
        '--disable-features=TrackingProtection3pcd',
        '--no-sandbox',
        '--disable-setuid-sandbox'
    ],
    extraPuppeteerOptions: {}
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
        args: [...default_1.defaultPuppeteerBrowserOptions.args, ...args.extraChromiumArgs],
        headless: args.headless,
        userDataDir
    };
    if (args.puppeteerExecutablePath) {
        options['executablePath'] = args.puppeteerExecutablePath;
    }
    try {
        browser = await puppeteer_1.default.launch(options);
        browser.on('disconnected', () => {
            didBrowserDisconnect = true;
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
        await page.on('request', request => {
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
            await (0, cookie_collector_1.clearCookiesCache)(page);
        }
        // Init blacklight instruments on page
        await (0, inspector_1.setupBlacklightInspector)(page, logger.warn);
        await (0, key_logging_1.setupKeyLoggingInspector)(page, logger.warn);
        await (0, cookie_collector_1.setupHttpCookieCapture)(page, logger.warn);
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
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 3000 }).catch(() => { });
            await new Promise(resolve => setTimeout(resolve, 3000));
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
        await (0, interaction_utils_1.fillForms)(page);
        // console.log('... done with fillForms');
        await (0, interaction_utils_1.autoScroll)(page);
        // console.log('... done with autoScroll');
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
        // try {
        for (const link of output.browsing_history.slice(1)) {
            logger.log('info', `browsing now to ${link}`, { type: 'Browser' });
            if (didBrowserDisconnect) {
                return {
                    status: 'failed',
                    page_response: 'Chrome crashed'
                };
            }
            if (args.clearCache) {
                await (0, cookie_collector_1.clearCookiesCache)(page);
            }
            // console.log(`Browsing now to ${link}`);
            await navigateWithTimeout(page, link, args.defaultTimeout, args.defaultWaitUntil);
            await (0, interaction_utils_1.fillForms)(page);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
            duplicatedLinks = duplicatedLinks.concat(await (0, get_links_1.getLinks)(page));
            await (0, interaction_utils_1.autoScroll)(page);
            pageIndex++;
        }
        // console.log('saving cookies');
        await (0, cookie_collector_1.captureBrowserCookies)(page, args.outDir);
        // console.log('... done saving cookies');
        if (args.captureHar) {
            // console.log('saving har');
            await har.stop();
            // console.log('... done saving har');
        }
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
        // console.log('generating report');
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
        // console.log('writing inspection.json');
        const json_dump = JSON.stringify({ ...output, reports }, null, 2);
        (0, fs_1.writeFileSync)((0, path_1.join)(os_1.default.tmpdir(), args.outDir, 'inspection.json'), json_dump);
        if (args.outDir.includes('bl-tmp')) {
            (0, utils_1.clearDir)(args.outDir, false);
        }
        // also save the reports to the report directory
        const report_name = inUrl
            .replace(/^https?:\/\//, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+$/g, '');
        (0, fs_1.writeFileSync)((0, path_1.join)(os_1.default.tmpdir(), args.reportDir, `${report_name}.json`), json_dump);
        return { status: 'success', ...output, reports };
    }
    finally {
        // close browser and clear tmp dir
        if (browser && !didBrowserDisconnect) {
            await (0, utils_1.closeBrowser)(browser);
        }
        // if (typeof userDataDir !== 'undefined') {
        //     clearDir(userDataDir, false);
        // }
        // if (args.outDir.includes('bl-tmp')) {
        //     clearDir(args.outDir, false);
        // }
    }
};
exports.collect = collect;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGVjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29sbGVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkJBQW1DO0FBQ25DLDBFQUEyQztBQUMzQyw0Q0FBb0I7QUFDcEIsK0JBQTRCO0FBQzVCLHVEQUFvSDtBQUNwSCxrRUFBeUM7QUFDekMsaUNBQXVEO0FBQ3ZELHlEQUFzRztBQUV0RyxxQ0FBcUM7QUFDckMscUNBQTBDO0FBQzFDLGtEQUF1RjtBQUN2RixzREFBOEU7QUFDOUUsc0VBQXVFO0FBQ3ZFLHNEQUFrRTtBQUNsRSwwREFBb0U7QUFDcEUsc0VBQWdGO0FBQ2hGLDRFQUFxRjtBQUNyRixtQ0FBaUQ7QUFJakQsTUFBTSxlQUFlLEdBQUc7SUFDcEIsTUFBTSxFQUFFLElBQUEsV0FBSSxFQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxRQUFRLENBQUM7SUFDckMsU0FBUyxFQUFFLElBQUEsV0FBSSxFQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxTQUFTLENBQUM7SUFDekMsS0FBSyxFQUFFLHVCQUF1QjtJQUM5QixhQUFhLEVBQUUsd0JBQVksQ0FBQyxnQkFBZ0IsQ0FBQztJQUM3QyxVQUFVLEVBQUUsSUFBSTtJQUNoQixZQUFZLEVBQUUsS0FBSztJQUNuQixhQUFhLEVBQUUsS0FBSztJQUNwQixVQUFVLEVBQUUsSUFBSTtJQUNoQixLQUFLLEVBQUUsSUFBSTtJQUNYLFFBQVEsRUFBRSxJQUFJO0lBQ2QsY0FBYyxFQUFFLEtBQUs7SUFDckIsUUFBUSxFQUFFLENBQUM7SUFDWCxnQkFBZ0IsRUFBRSxjQUF5QztJQUMzRCxrQkFBa0IsRUFBRSxLQUFLO0lBQ3pCLGVBQWUsRUFBRSxJQUFJO0lBQ3JCLE9BQU8sRUFBRSxFQUFFO0lBQ1gsT0FBTyxFQUFFO1FBQ0wsMkJBQTJCO1FBQzNCLHVCQUF1QjtRQUN2Qiw0QkFBNEI7UUFDNUIsU0FBUztRQUNU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