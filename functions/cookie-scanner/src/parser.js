"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportCookieEvents = exports.reportCanvasFontFingerprinters = exports.reportCanvasFingerprinters = exports.generateReport = void 0;
const tldts_1 = require("tldts");
const canvas_fingerprinting_1 = require("./canvas-fingerprinting");
const cookies_1 = require("./inspectors/cookies");
const statics_1 = require("./helpers/statics");
const utils_1 = require("./helpers/utils");
const generateReport = (reportType, messages, dataDir, url) => {
    const eventData = getEventData(reportType, messages);
    switch (reportType) {
        case 'cookies':
            return (0, exports.reportCookieEvents)(eventData, dataDir, url);
        case 'key_logging':
            return reportKeyLogging(eventData);
        case 'behaviour_event_listeners':
            return reportEventListeners(eventData);
        case 'canvas_fingerprinters':
            return (0, exports.reportCanvasFingerprinters)(eventData);
        case 'canvas_font_fingerprinters':
            return (0, exports.reportCanvasFontFingerprinters)(eventData);
        case 'fb_pixel_events':
            return reportFbPixelEvents(eventData);
        case 'google_analytics_events':
            return reportGoogleAnalyticsEvents(eventData);
        case 'fingerprintable_api_calls':
            return reportFingerprintableAPIs(eventData);
        case 'session_recorders':
            return reportSessionRecorders(eventData);
        case 'third_party_trackers':
            return reportThirdPartyTrackers(eventData, url);
        case 'tiktok_pixel_events':
            return reportTikTokPixelEvents(eventData);
        case 'twitter_pixel_events':
            return reportTwitterPixel(eventData);
        default:
            return {};
    }
};
exports.generateReport = generateReport;
const filterByEvent = (messages, typePattern) => {
    return messages.filter(m => m.message.type.includes(typePattern) && !m.message.type.includes('Error'));
};
const getEventData = (reportType, messages) => {
    let filtered = [];
    switch (reportType) {
        case 'cookies':
            filtered = filterByEvent(messages, 'JsInstrument');
            filtered = filtered.concat(filterByEvent(messages, 'Cookie.HTTP'));
            break;
        case 'key_logging':
            filtered = filterByEvent(messages, 'KeyLogging');
            break;
        case 'behaviour_event_listeners':
            filtered = filterByEvent(messages, 'JsInstrument');
            break;
        case 'canvas_fingerprinters':
            filtered = filterByEvent(messages, 'JsInstrument');
            break;
        case 'canvas_font_fingerprinters':
            filtered = filterByEvent(messages, 'JsInstrument');
            break;
        case 'fingerprintable_api_calls':
            filtered = filterByEvent(messages, 'JsInstrument');
            break;
        case 'session_recorders':
            filtered = filterByEvent(messages, 'SessionRecording');
            break;
        case 'third_party_trackers':
        case 'fb_pixel_events':
        case 'google_analytics_events':
        case 'tiktok_pixel_events':
        case 'twitter_pixel_events':
            filtered = filterByEvent(messages, 'TrackingRequest');
            break;
        default:
            return [];
    }
    return filtered.map(m => m.message);
};
const reportSessionRecorders = (eventData) => {
    const report = {};
    eventData.forEach((event) => {
        const match = event.matches[0];
        if (Object.keys(report).includes(match) && !report[match].includes(event.url)) {
            report[match].push(event.url);
        }
        else {
            report[match] = [event.url];
        }
    });
    return report;
};
const MONITORED_EVENTS = [].concat(...Object.values(statics_1.BEHAVIOUR_TRACKING_EVENTS));
const reportEventListeners = (eventData) => {
    const parsedEvents = [];
    eventData.forEach((event) => {
        const data = event.data;
        if (data.symbol.indexOf('addEventListener') > -1 && data.value) {
            const values = (0, utils_1.loadJSONSafely)(data.value);
            if (Array.isArray(values) && MONITORED_EVENTS.includes(values[0])) {
                const eventGroup = Object.keys(statics_1.BEHAVIOUR_TRACKING_EVENTS).filter(key => statics_1.BEHAVIOUR_TRACKING_EVENTS[key].includes(values[0]));
                parsedEvents.push({
                    data: {
                        event_group: eventGroup.length ? eventGroup[0] : '',
                        name: values[0]
                    },
                    stack: event.stack,
                    url: event.url
                });
            }
        }
    });
    const output = parsedEvents.reduce((acc, cur) => {
        const script = (0, utils_1.getScriptUrl)(cur);
        const data = cur.data;
        if (!script) {
            return acc;
        }
        if ((0, utils_1.hasOwnProperty)(acc, data.event_group)) {
            if ((0, utils_1.hasOwnProperty)(acc[data.event_group], script)) {
                acc[data.event_group][script].add(data.name);
            }
            else {
                acc[data.event_group][script] = new Set([data.name]);
            }
        }
        else {
            acc[data.event_group] = { [script]: new Set([data.name]) };
        }
        return acc;
    }, {});
    const serializable = {};
    for (const [event_group, script_obj] of Object.entries(output)) {
        serializable[event_group] = {};
        for (const [script, events] of Object.entries(script_obj)) {
            serializable[event_group][script] = Array.from(events);
        }
    }
    return serializable;
};
const reportCanvasFingerprinters = (eventData) => {
    return (0, canvas_fingerprinting_1.getCanvasFingerprinters)(eventData);
};
exports.reportCanvasFingerprinters = reportCanvasFingerprinters;
const reportCanvasFontFingerprinters = (eventData) => {
    return (0, canvas_fingerprinting_1.getCanvasFontFingerprinters)(eventData);
};
exports.reportCanvasFontFingerprinters = reportCanvasFontFingerprinters;
const reportCookieEvents = (eventData, dataDir, url) => {
    const browser_cookies = (0, cookies_1.loadBrowserCookies)(dataDir);
    return (0, cookies_1.matchCookiesToEvents)(browser_cookies, eventData, url);
};
exports.reportCookieEvents = reportCookieEvents;
const reportKeyLogging = (eventData) => {
    const groupByRequestPs = (0, utils_1.groupBy)('post_request_ps');
    return groupByRequestPs(eventData.map((m) => ({
        ...m.data,
        post_request_ps: getDomainSafely(m)
    })));
};
const WINDOW_FP_LIST = [].concat(...Object.values(statics_1.FINGERPRINTABLE_WINDOW_APIS));
const reportFingerprintableAPIs = (eventData) => {
    const parsedEvents = [];
    eventData.forEach((event) => {
        const data = event.data;
        if (WINDOW_FP_LIST.includes(data.symbol)) {
            const windowApiGroup = Object.keys(statics_1.FINGERPRINTABLE_WINDOW_APIS).filter(key => statics_1.FINGERPRINTABLE_WINDOW_APIS[key].includes(data.symbol));
            parsedEvents.push({
                api_group: windowApiGroup[0],
                stack: event.stack,
                symbol: data.symbol
            });
        }
    });
    const output = parsedEvents.reduce((acc, cur) => {
        const script = (0, utils_1.getScriptUrl)(cur);
        if (!script) {
            return acc;
        }
        if ((0, utils_1.hasOwnProperty)(acc, cur.api_group)) {
            if ((0, utils_1.hasOwnProperty)(acc[cur.api_group], script)) {
                acc[cur.api_group][script].add(cur.symbol);
            }
            else {
                acc[cur.api_group][script] = new Set([cur.symbol]);
            }
        }
        else {
            acc[cur.api_group] = { [script]: new Set([cur.symbol]) };
        }
        return acc;
    }, {});
    const serializable = {};
    for (const [api_group, script_obj] of Object.entries(output)) {
        serializable[api_group] = {};
        for (const [script, events] of Object.entries(script_obj)) {
            serializable[api_group][script] = Array.from(events);
        }
    }
    return serializable;
};
const reportThirdPartyTrackers = (eventData, firstPartyDomain) => {
    return eventData.filter(e => {
        const requestDomain = (0, tldts_1.getDomain)(e.url);
        const isThirdPartyDomain = requestDomain && requestDomain !== firstPartyDomain;
        return isThirdPartyDomain;
    });
};
const reportGoogleAnalyticsEvents = (eventData) => {
    const googleAnalyticsEvents = eventData.filter((event) => {
        // Match both the analytics collect beacons (google-analytics.com/collect and
        // GA4 /g/collect, incl. region* and www subdomains) and the Google Signals /
        // Ads endpoint (stats.g.doubleclick.net), as long as they carry a measurement id.
        let hostname;
        try {
            hostname = new URL(event.url).hostname.toLowerCase();
        }
        catch {
            return false;
        }
        const isGoogleAnalyticsHost = hostname === 'google-analytics.com' || hostname.endsWith('.google-analytics.com');
        const isGoogleSignalsHost = hostname === 'stats.g.doubleclick.net';
        return (isGoogleAnalyticsHost || isGoogleSignalsHost)
            && (event.url.includes('UA-') // old version of google ids
                || event.url.includes('G-') // this and following are new version
                || event.url.includes('AW-'));
    });
    return googleAnalyticsEvents.map((event) => {
        // Build a new object instead of `delete event.url`: these event objects
        // are shared by reference across every report (getEventData hands out the
        // same message instances), so mutating url here would strip it from later
        // reports such as third_party_trackers (which runs after this one).
        const { url, ...rest } = event;
        return {
            ...rest,
            raw: url,
        };
    });
};
const reportFbPixelEvents = (eventData) => {
    const events = eventData.filter((e) => e.url.includes('facebook') && e.data.query && Object.keys(e.data.query).includes('ev') && e.data.query.ev !== 'Microdata');
    return events.map((e) => {
        // Per-event arrays: declaring these outside the map would alias the same arrays
        // across every returned entry, accumulating params from all events into each.
        const advancedMatchingParams = [];
        const dataParams = [];
        let eventName = '';
        let eventDescription = '';
        let pageUrl = '';
        let isStandardEvent = false;
        for (const [key, value] of Object.entries(e.data.query)) {
            if (key === 'dl') {
                pageUrl = value;
            }
            if (key === 'ev') {
                const standardEvent = statics_1.FB_STANDARD_EVENTS.filter(f => f.eventName === value);
                if (standardEvent.length > 0) {
                    isStandardEvent = true;
                    eventName = standardEvent[0].eventName;
                    eventDescription = standardEvent[0].eventDescription;
                }
                else {
                    eventName = value;
                }
            }
            if (/cd\[.*\]/.test(key)) {
                const cdLabel = /cd\[(.*)\]/.exec(key);
                dataParams.push({ key, value, cleanKey: cdLabel[1] });
            }
            if (/ud\[.*\]/.test(key)) {
                const description = statics_1.FB_ADVANCED_MATCHING_PARAMETERS[key];
                if (!advancedMatchingParams.some(s => s.key === key && s.value === value)) {
                    advancedMatchingParams.push({ key, value, description });
                }
            }
        }
        return {
            advancedMatchingParams,
            dataParams,
            eventDescription,
            eventName,
            isStandardEvent,
            pageUrl,
            raw: e.url
        };
    });
};
const reportTikTokPixelEvents = (eventData) => {
    const events = eventData.filter((e) => e.url.includes('tiktok') &&
        e.data.body && typeof e.data.body === 'object' && !Array.isArray(e.data.body) &&
        Object.keys(e.data.body).includes('event'));
    return events.map((e) => {
        const advancedMatchingParams = [];
        const dataParams = [];
        let eventName = '';
        let eventDescription = '';
        let pageUrl = '';
        let isStandardEvent = false;
        for (const [key, value] of Object.entries(e.data.body)) {
            if (key === 'context') {
                // safely extract page url and user info
                const context = value;
                pageUrl = context?.page?.url || '';
                // extract advanced matching parameters (context may be null/non-object;
                // `context.user` would throw a TypeError when context is null)
                const userInfo = Object.assign({}, context?.user, context?.device);
                Object.entries(userInfo).forEach(([key, value]) => {
                    const description = statics_1.TIKTOK_ADVANCED_MATCHING_PARAMETERS[key] ?? '';
                    advancedMatchingParams.push({ key, value, description });
                });
            }
            // extract standard event
            if (key === 'event') {
                const eventStr = value;
                const standardEvent = statics_1.TIKTOK_STANDARD_EVENTS.filter(f => f.eventName.toUpperCase() === eventStr.toUpperCase());
                if (standardEvent.length > 0) {
                    isStandardEvent = true;
                    eventName = standardEvent[0].eventName;
                    eventDescription = standardEvent[0].eventDescription;
                }
                else {
                    eventName = eventStr;
                }
            }
            // extract data parameters (guard against null/primitive `properties`:
            // Object.entries(null) throws, and a string would yield character indices)
            if (key === "properties" && value && typeof value === 'object') {
                Object.entries(value).forEach(([key, value]) => {
                    dataParams.push({ key, value });
                });
            }
        }
        return {
            advancedMatchingParams,
            dataParams,
            eventDescription,
            eventName,
            isStandardEvent,
            pageUrl,
            raw: e.url
        };
    });
};
const reportTwitterPixel = (eventData) => {
    const events = eventData.filter((e) => {
        return e.url.includes('twitter') && e.data.query && !e.url.includes("static");
    });
    return events.map((e) => {
        const advancedMatchingParams = [];
        const dataParams = [];
        const query = e.data.query ?? {};
        let deviceIdentifier;
        let eventName = '';
        let eventDescription = '';
        let pageUrl = '';
        let isStandardEvent = false;
        for (const [key, value] of Object.entries(e.data.query)) {
            if (key === 'tw_document_href') {
                pageUrl = value;
            }
            // The main "event" object often contains core info
            if ((key === 'event' || key === "events") && value) {
                // array serilization data format
                // e.g. [... "event", {... key: value}]
                if (Array.isArray(value)) {
                    value.forEach(event => {
                        // process event name
                        if (event[0]) {
                            eventName = event[0];
                            const standardEvent = statics_1.TWITTER_STANDARD_EVENTS.filter(f => f.eventName === eventName);
                            if (standardEvent.length > 0) {
                                isStandardEvent = true;
                                eventDescription = standardEvent[0].eventDescription;
                            }
                        }
                        // process data parameters
                        if (event[1]) {
                            Object.entries(event[1]).forEach(([k, v]) => {
                                dataParams.push({
                                    key: k,
                                    value: v
                                });
                            });
                        }
                    });
                }
                else if (value && typeof value === 'object') {
                    for (const [eventKey, eventValue] of Object.entries(value)) {
                        if (eventKey === 'content_type') {
                            eventName = eventValue;
                            const standardEvent = statics_1.TWITTER_STANDARD_EVENTS.filter(f => f.eventName === eventValue);
                            if (standardEvent.length > 0) {
                                isStandardEvent = true;
                                eventDescription = standardEvent[0].eventDescription;
                            }
                        }
                        // data parameters of products details within contents array 
                        //e.g. [...{... "id": "123", "quantity": 1}]
                        else if (eventKey === 'contents' && Array.isArray(eventValue)) {
                            eventValue.forEach(kv => {
                                Object.entries(kv).forEach(([k, v]) => {
                                    dataParams.push({
                                        key: k,
                                        value: v
                                    });
                                });
                            });
                        }
                        // other data parameters
                        else {
                            dataParams.push({
                                key: eventKey,
                                value: eventValue
                            });
                        }
                    }
                }
                else {
                    // Plain string / primitive event identifier (the query param wasn't
                    // a JSON array or object): treat it as the event name instead of
                    // iterating its characters via Object.entries.
                    eventName = value;
                    const standardEvent = statics_1.TWITTER_STANDARD_EVENTS.filter(f => f.eventName === value);
                    if (standardEvent.length > 0) {
                        isStandardEvent = true;
                        eventDescription = standardEvent[0].eventDescription;
                    }
                }
            }
            else if (key === 'dv') {
                deviceIdentifier = value;
            }
            // Advanced matching parameters (e.g. for email, phone)
            if (statics_1.TWITTER_ADVANCED_MATCHING_PARAMETERS[key]) {
                advancedMatchingParams.push({ key, value, "description": statics_1.TWITTER_ADVANCED_MATCHING_PARAMETERS[key] ?? "" });
            }
        }
        return {
            advancedMatchingParams,
            query,
            deviceIdentifier,
            dataParams,
            eventDescription,
            eventName,
            isStandardEvent,
            pageUrl,
            raw: e.url,
        };
    });
};
const getDomainSafely = (message) => {
    try {
        if (message.data.post_request_url) {
            return (0, tldts_1.getDomain)(message.data.post_request_url);
        }
        else {
            console.log('message.data missing post_request_url', JSON.stringify(message));
            return '';
        }
    }
    catch (error) {
        return '';
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGlDQUFrQztBQUNsQyxtRUFBK0Y7QUFDL0Ysa0RBQWdGO0FBQ2hGLCtDQUE0UTtBQUU1USwyQ0FBd0Y7QUFFakYsTUFBTSxjQUFjLEdBQUcsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRTtJQUNqRSxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3JELFFBQVEsVUFBVSxFQUFFO1FBQ2hCLEtBQUssU0FBUztZQUNWLE9BQU8sSUFBQSwwQkFBa0IsRUFBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZELEtBQUssYUFBYTtZQUNkLE9BQU8sZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkMsS0FBSywyQkFBMkI7WUFDNUIsT0FBTyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMzQyxLQUFLLHVCQUF1QjtZQUN4QixPQUFPLElBQUEsa0NBQTBCLEVBQUMsU0FBUyxDQUFDLENBQUM7UUFDakQsS0FBSyw0QkFBNEI7WUFDN0IsT0FBTyxJQUFBLHNDQUE4QixFQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3JELEtBQUssaUJBQWlCO1lBQ2xCLE9BQU8sbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDMUMsS0FBSyx5QkFBeUI7WUFDMUIsT0FBTywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNsRCxLQUFLLDJCQUEyQjtZQUM1QixPQUFPLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2hELEtBQUssbUJBQW1CO1lBQ3BCLE9BQU8sc0JBQXNCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0MsS0FBSyxzQkFBc0I7WUFDdkIsT0FBTyx3QkFBd0IsQ0FBQyxTQUFTLEVBQUUsR0FBRyxD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