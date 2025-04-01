import { writeFileSync } from 'fs';
import sampleSize from 'lodash.samplesize';
import os from 'os';
import { join } from 'path';
import puppeteer, { Browser, Page, PuppeteerLifeCycleEvent, KnownDevices, PuppeteerLaunchOptions } from 'puppeteer';
import PuppeteerHar from 'puppeteer-har';
import { getDomain, getSubdomain, parse } from 'tldts';
import { captureBrowserCookies, clearCookiesCache, setupHttpCookieCapture } from './inspectors/cookies';

import { getLogger } from './helpers/logger';
import { generateReport } from './parser';
import { defaultPuppeteerBrowserOptions, savePageContent } from './pptr-utils/default';
import { dedupLinks, getLinks, getSocialLinks } from './pptr-utils/get-links';
import { autoScroll } from './pptr-utils/interaction-utils';
// import { fillForms } from './pptr-utils/interaction-utils';
import { setupBlacklightInspector } from './inspectors/inspector';
import { setupKeyLoggingInspector } from './inspectors/key-logging';
import { setupSessionRecordingInspector } from './inspectors/session-recording';
import { setUpThirdPartyTrackersInspector } from './inspectors/third-party-trackers';
import { clearDir, closeBrowser } from './helpers/utils';

import chromium from '@sparticuz/chromium';

export type CollectorOptions = Partial<typeof DEFAULT_OPTIONS>;

const DEFAULT_OPTIONS = {
    outDir: join(process.cwd(), 'bl-tmp'),
    reportDir: join(process.cwd(), 'reports'),
    title: 'Blacklight Inspection',
    emulateDevice: KnownDevices['iPhone 13 Mini'],
    captureHar: false,
    captureLinks: false,
    enableAdBlock: false,
    clearCache: true,
    quiet: true,
    headless: true,
    defaultTimeout: 45000,
    numPages: 0,
    defaultWaitUntil: 'networkidle2' as PuppeteerLifeCycleEvent,
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
    puppeteerExecutablePath: null as string | null,
    extraChromiumArgs: ['--disable-features=TrackingProtection3pcd'] as string[],
    extraPuppeteerOptions: {} as Partial<PuppeteerLaunchOptions>
};

const cleanupBeforeClose = async (page: Page) => {
    try {
        // Clear all listeners
        await page.removeAllListeners();
        
        // Stop any media playback
        await page.evaluate(() => {
            document.querySelectorAll('video, audio').forEach((media: HTMLMediaElement) => {
                try {
                    media.pause();
                    media.remove();
                } catch (e) {}
            });
        });
        
        // Clear memory
        await page.evaluate(() => {
            if (window.gc) {
                window.gc();
            }
        });
    } catch (e) {
        // Ignore cleanup errors
    }
};

export const collect = async (inUrl: string, args: CollectorOptions) => {
    args = { ...DEFAULT_OPTIONS, ...args };
    clearDir(args.outDir);
    const FIRST_PARTY = parse(inUrl);
    let REDIRECTED_FIRST_PARTY = parse(inUrl);
    const logger = getLogger({ outDir: args.outDir, quiet: args.quiet });

    const output: any = {
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
            host: os.hostname(),
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

    let browser: Browser;
    let page: Page;
    let pageIndex = 1;
    let har = {} as any;
    let page_response = null;
    const userDataDir = args.saveBrowserProfile ? join(args.outDir, 'browser-profile') : undefined;
    let didBrowserDisconnect = false;

    const options = {
        ...defaultPuppeteerBrowserOptions,
        args: [
            ...chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            `--user-agent=${args.emulateDevice.userAgent}`,
            ...args.extraChromiumArgs
        ],
        defaultViewport: {
            width: args.emulateDevice.viewport.width,
            height: args.emulateDevice.viewport.height
        },
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
        userDataDir
    };
    try {
        browser = await puppeteer.launch(options);
        browser.on('disconnected', () => {
            didBrowserDisconnect = true;
            // Attempt cleanup of any remaining processes
            try {
                if (browser.process()) {
                    browser.process()?.kill('SIGKILL');
                }
            } catch (e) {
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
                name: os.type(),
                version: os.release()
            }
        };
        page.emulate(args.emulateDevice);

        if (Object.keys(args.headers).length > 0) {
            page.setExtraHTTPHeaders(args.headers);
        }

        // record all requested hosts
        page.on('request', request => {
            const l = parse(request.url());
            // note that hosts may appear as first and third party depending on the path
            if (FIRST_PARTY.domain === l.domain) {
                hosts.requests.first_party.add(l.hostname);
            } else {
                if (request.url().indexOf('data://') < 1 && !!l.hostname) {
                    hosts.requests.third_party.add(l.hostname);
                }
            }
        });

        if (args.clearCache) {
            await clearCookiesCache(page);
        }

        // Init blacklight instruments on page
        await setupBlacklightInspector(page, logger.warn);
        await setupKeyLoggingInspector(page, logger.warn);
        await setupHttpCookieCapture(page, logger.warn);
        await setupSessionRecordingInspector(page, logger.warn);
        await setUpThirdPartyTrackersInspector(page, logger.warn, args.enableAdBlock);

        if (args.captureHar) {
            har = new PuppeteerHar(page);
            await har.start({
                path: args.outDir ? join(args.outDir, 'requests.har') : undefined
            });
        }
        if (didBrowserDisconnect) {
            return {
                status: 'failed',
                page_response: 'Chrome crashed'
            };
        }

        // Function to navigate to a page with a timeout guard
        const navigateWithTimeout = async (page: Page, url: string, timeout: number, waitUntil: PuppeteerLifeCycleEvent) => {
            try {
                page_response = await page.goto(url, {
                    waitUntil: waitUntil,
                    timeout: timeout
                });
            } catch (error) {
                page_response = await page.goto(url, {
                    timeout: timeout,
                    waitUntil: 'domcontentloaded' as PuppeteerLifeCycleEvent
                });
            }
            // Wait for network to be idle and additional time for dynamic content
            await page.waitForNavigation({ waitUntil: waitUntil, timeout: 30000 }).catch(() => {});
            await new Promise(resolve => setTimeout(resolve, 30000));
            await savePageContent(pageIndex, args.outDir, page, args.saveScreenshots);
        };

        // Go to the first url
        // console.log('Going to the first url', inUrl);
        await navigateWithTimeout(page, inUrl, args.defaultTimeout, args.defaultWaitUntil as PuppeteerLifeCycleEvent);

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
        duplicatedLinks = await getLinks(page);
        REDIRECTED_FIRST_PARTY = parse(output.uri_dest);
        for (const link of dedupLinks(duplicatedLinks)) {
            const l = parse(link.href);

            if (REDIRECTED_FIRST_PARTY.domain === l.domain) {
                outputLinks.first_party.push(link);
                hosts.links.first_party.add(l.hostname);
            } else {
                if (l.hostname && l.hostname !== 'data') {
                    outputLinks.third_party.push(link);
                    hosts.links.third_party.add(l.hostname);
                }
            }
        }
        // await fillForms(page);
        // console.log('... done with fillForms');
        await autoScroll(page);

        let subDomainLinks = [];
        if (getSubdomain(output.uri_dest) !== 'www') {
            subDomainLinks = outputLinks.first_party.filter(f => {
                return getSubdomain(f.href) === getSubdomain(output.uri_dest);
            });
        } else {
            subDomainLinks = outputLinks.first_party;
        }
        const browse_links = sampleSize(subDomainLinks, args.numPages);
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
                await clearCookiesCache(page);
            }
            // console.log(`Browsing now to ${link}`);

            await navigateWithTimeout(page, link, args.defaultTimeout, args.defaultWaitUntil as PuppeteerLifeCycleEvent);

            // await fillForms(page);

            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second

            duplicatedLinks = duplicatedLinks.concat(await getLinks(page));
            await autoScroll(page);

            pageIndex++;
        }

        await captureBrowserCookies(page, args.outDir);
        if (args.captureHar) {
            await har.stop();
        }

        const pages = await browser.pages();
        await Promise.all(pages.map(cleanupBeforeClose));
        await closeBrowser(browser);
        if (typeof userDataDir !== 'undefined') {
            clearDir(userDataDir, false);
        }

        const links = dedupLinks(duplicatedLinks);
        output.end_time = new Date();
        for (const link of links) {
            const l = parse(link.href);

            if (REDIRECTED_FIRST_PARTY.domain === l.domain) {
                outputLinks.first_party.push(link);
                hosts.links.first_party.add(l.hostname);
            } else {
                if (l.hostname && l.hostname !== 'data') {
                    outputLinks.third_party.push(link);
                    hosts.links.third_party.add(l.hostname);
                }
            }
        }

        // generate report
        const fpRequests = Array.from(hosts.requests.first_party);
        const tpRequests = Array.from(hosts.requests.third_party);
        const incorrectTpAssignment = tpRequests.filter((f: string) => getDomain(f) === REDIRECTED_FIRST_PARTY.domain);
        output.hosts = {
            requests: {
                first_party: fpRequests.concat(incorrectTpAssignment),
                third_party: tpRequests.filter(t => !incorrectTpAssignment.includes(t))
            }
        };

        if (args.captureLinks) {
            output.links = outputLinks;
            output.social = getSocialLinks(links);
        }

        const event_data_all = await new Promise(done => {
            logger.query(
                {
                    start: 0,
                    order: 'desc',
                    limit: Infinity,
                    fields: ['message']
                },
                (err, results) => {
                    if (err) {
                        console.log(`Couldnt load event data ${JSON.stringify(err)}`);
                        return done([]);
                    }

                    return done(results.file);
                }
            );
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
            acc[cur] = generateReport(cur, event_data, args.outDir, REDIRECTED_FIRST_PARTY.domain);
            return acc;
        }, {});

        const json_dump = JSON.stringify({ ...output, reports }, null, 2);
        writeFileSync(join(args.outDir, 'inspection.json'), json_dump);
        if (args.outDir.includes('bl-tmp')) {
            clearDir(args.outDir, false);
        }
        // also save the reports to the report directory
        const report_name = inUrl
            .replace(/^https?:\/\//, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+$/g, '');
        writeFileSync(join(args.reportDir, `${report_name}.json`), json_dump);
        return { 
            status: 'success', 
            ...output, 
            reports,
        };
    } finally {
        if (browser && !didBrowserDisconnect) {
            const pages = await browser.pages();
            await Promise.all(pages.map(cleanupBeforeClose));
            await closeBrowser(browser);
        }
    }
};
