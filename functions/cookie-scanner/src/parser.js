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
        case 'fingerprintable_api_calls':
            return reportFingerprintableAPIs(eventData);
        case 'session_recorders':
            return reportSessionRecorders(eventData);
        case 'third_party_trackers':
            return reportThirdPartyTrackers(eventData, url);
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
            filtered = filterByEvent(messages, 'TrackingRequest');
            break;
        case 'fb_pixel_events':
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
const reportThirdPartyTrackers = (eventData, fpDomain) => {
    return eventData.filter(e => {
        const requestDomain = (0, tldts_1.getDomain)(e.url);
        const isThirdPartyDomain = requestDomain && requestDomain !== fpDomain;
        return isThirdPartyDomain;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGlDQUFrQztBQUNsQyxtRUFBK0Y7QUFDL0Ysa0RBQWdGO0FBQ2hGLCtDQUsyQjtBQVEzQiwyQ0FLeUI7QUFFbEIsTUFBTSxjQUFjLEdBQUcsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRTtJQUNqRSxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3JELFFBQVEsVUFBVSxFQUFFO1FBQ2hCLEtBQUssU0FBUztZQUNWLE9BQU8sSUFBQSwwQkFBa0IsRUFBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZELEtBQUssYUFBYTtZQUNkLE9BQU8sZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkMsS0FBSywyQkFBMkI7WUFDNUIsT0FBTyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMzQyxLQUFLLHVCQUF1QjtZQUN4QixPQUFPLElBQUEsa0NBQTBCLEVBQUMsU0FBUyxDQUFDLENBQUM7UUFDakQsS0FBSyw0QkFBNEI7WUFDN0IsT0FBTyxJQUFBLHNDQUE4QixFQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3JELEtBQUssaUJBQWlCO1lBQ2xCLE9BQU8sbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDMUMsS0FBSywyQkFBMkI7WUFDNUIsT0FBTyx5QkFBeUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNoRCxLQUFLLG1CQUFtQjtZQUNwQixPQUFPLHNCQUFzQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzdDLEtBQUssc0JBQXNCO1lBQ3ZCLE9BQU8sd0JBQXdCLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3BEO1lBQ0ksT0FBTyxFQUFFLENBQUM7S0FDakI7QUFDTCxDQUFDLENBQUM7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