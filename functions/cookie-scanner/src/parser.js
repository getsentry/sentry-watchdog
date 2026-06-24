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
        return event.url.includes('stats.g.doubleclick')
            && (event.url.includes('UA-') // old version of google ids
                || event.url.includes('G-') // this and following are new version
                || event.url.includes('AW-'));
    });
    return googleAnalyticsEvents.map((event) => {
        const url = event.url;
        delete event.url;
        return {
            ...event,
            raw: url,
        };
    });
};
const reportFbPixelEvents = (eventData) => {
    const events = eventData.filter((e) => e.url.includes('facebook') && e.data.query && Object.keys(e.data.query).includes('ev') && e.data.query.ev !== 'Microdata');
    const advancedMatchingParams = [];
    const dataParams = [];
    return events.map((e) => {
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
    const events = eventData.filter((e) => e.url.includes('tiktok') && e.data.body && Object.keys(e.data.body).includes('event'));
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
                // extract advanced matching parameters
                const userInfo = Object.assign({}, context.user, context.device);
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
            // extract data parameters
            if (key === "properties") {
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
                else {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGlDQUFrQztBQUNsQyxtRUFBK0Y7QUFDL0Ysa0RBQWdGO0FBQ2hGLCtDQVMyQjtBQVMzQiwyQ0FLeUI7QUFFbEIsTUFBTSxjQUFjLEdBQUcsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRTtJQUNqRSxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3JELFFBQVEsVUFBVSxFQUFFO1FBQ2hCLEtBQUssU0FBUztZQUNWLE9BQU8sSUFBQSwwQkFBa0IsRUFBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZELEtBQUssYUFBYTtZQUNkLE9BQU8sZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkMsS0FBSywyQkFBMkI7WUFDNUIsT0FBTyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMzQyxLQUFLLHVCQUF1QjtZQUN4QixPQUFPLElBQUEsa0NBQTBCLEVBQUMsU0FBUyxDQUFDLENBQUM7UUFDakQsS0FBSyw0QkFBNEI7WUFDN0IsT0FBTyxJQUFBLHNDQUE4QixFQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3JELEtBQUssaUJBQWlCO1lBQ2xCLE9BQU8sbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDMUMsS0FBSyx5QkFBeUI7WUFDMUIsT0FBTywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNsRCxLQUFLLDJCQUEyQjtZQUM1QixPQUFPLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2hELEtBQUssbUJBQW1CO1lBQ3BCLE9BQU8sc0JBQXNCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0MsS0FBSyxzQkFBc0I7WUFDdkIsT0FBTyx3QkFBd0IsQ0FBQyxTQUFTLEVBQUUsR0FBRyxD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