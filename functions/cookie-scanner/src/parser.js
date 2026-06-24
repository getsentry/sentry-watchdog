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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGlDQUFrQztBQUNsQyxtRUFBK0Y7QUFDL0Ysa0RBQWdGO0FBQ2hGLCtDQUFnSjtBQUVoSiwyQ0FBd0Y7QUFFakYsTUFBTSxjQUFjLEdBQUcsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRTtJQUNqRSxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3JELFFBQVEsVUFBVSxFQUFFLENBQUM7UUFDakIsS0FBSyxTQUFTO1lBQ1YsT0FBTyxJQUFBLDBCQUFrQixFQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdkQsS0FBSyxhQUFhO1lBQ2QsT0FBTyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN2QyxLQUFLLDJCQUEyQjtZQUM1QixPQUFPLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzNDLEtBQUssdUJBQXVCO1lBQ3hCLE9BQU8sSUFBQSxrQ0FBMEIsRUFBQyxTQUFTLENBQUMsQ0FBQztRQUNqRCxLQUFLLDRCQUE0QjtZQUM3QixPQUFPLElBQUEsc0NBQThCLEVBQUMsU0FBUyxDQUFDLENBQUM7UUFDckQsS0FBSyxpQkFBaUI7WUFDbEIsT0FBTyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMxQyxLQUFLLDJCQUEyQjtZQUM1QixPQUFPLHlCQUF5QixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2hELEtBQUssbUJBQW1CO1lBQ3BCLE9BQU8sc0JBQXNCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0MsS0FBSyxzQkFBc0I7WUFDdkIsT0FBTyx3QkFBd0IsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDcEQ7WUFDSSxPQUFPLEVBQUUsQ0FBQztJQUNsQixDQUFDO0FBQ0ws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