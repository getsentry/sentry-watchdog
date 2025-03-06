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
    extraChromiumArgs: ['--disable-features=TrackingProtection3pcd'],
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
            extraPuppeteerOptions: args.extraPuppeteerOptions,
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
        (0, fs_1.writeFileSync)((0, path_1.join)(args.outDir, 'inspection.json'), json_dump);
        if (args.outDir.includes('bl-tmp')) {
            (0, utils_1.clearDir)(args.outDir, false);
        }
        // also save the reports to the report directory
        const report_name = inUrl.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+$/g, '');
        (0, fs_1.writeFileSync)((0, path_1.join)(args.reportDir, `${report_name}.json`), json_dump);
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