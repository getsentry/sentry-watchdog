"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportCookieEvents = exports.reportCanvasFontFingerprinters = exports.reportCanvasFingerprinters = exports.generateReport = void 0;
const tldts_1 = require("tldts");
const canvas_fingerprinting_1 = require("./canvas-fingerprinting");
const cookie_collector_1 = require("./cookie-collector");
const fb_pixel_lookup_1 = require("./fb-pixel-lookup");
const types_1 = require("./types");
const utils_1 = require("./utils");
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
const MONITORED_EVENTS = [].concat(...Object.values(types_1.BEHAVIOUR_TRACKING_EVENTS));
const reportEventListeners = (eventData) => {
    const parsedEvents = [];
    eventData.forEach((event) => {
        const data = event.data;
        if (data.symbol.indexOf('addEventListener') > -1 && data.value) {
            const values = (0, utils_1.loadJSONSafely)(data.value);
            if (Array.isArray(values) && MONITORED_EVENTS.includes(values[0])) {
                const eventGroup = Object.keys(types_1.BEHAVIOUR_TRACKING_EVENTS).filter(key => types_1.BEHAVIOUR_TRACKING_EVENTS[key].includes(values[0]));
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
    return (0, canvas_fingerprinting_1.getCanvasFp)(eventData);
};
exports.reportCanvasFingerprinters = reportCanvasFingerprinters;
const reportCanvasFontFingerprinters = (eventData) => {
    return (0, canvas_fingerprinting_1.getCanvasFontFp)(eventData);
};
exports.reportCanvasFontFingerprinters = reportCanvasFontFingerprinters;
const reportCookieEvents = (eventData, dataDir, url) => {
    const browser_cookies = (0, cookie_collector_1.loadBrowserCookies)(dataDir);
    return (0, cookie_collector_1.matchCookiesToEvents)(browser_cookies, eventData, url);
};
exports.reportCookieEvents = reportCookieEvents;
const reportKeyLogging = (eventData) => {
    const groupByRequestPs = (0, utils_1.groupBy)('post_request_ps');
    return groupByRequestPs(eventData.map((m) => ({
        ...m.data,
        post_request_ps: getDomainSafely(m)
    })));
};
const WINDOW_FP_LIST = [].concat(...Object.values(types_1.FINGERPRINTABLE_WINDOW_APIS));
const reportFingerprintableAPIs = (eventData) => {
    const parsedEvents = [];
    eventData.forEach((event) => {
        const data = event.data;
        if (WINDOW_FP_LIST.includes(data.symbol)) {
            const windowApiGroup = Object.keys(types_1.FINGERPRINTABLE_WINDOW_APIS).filter(key => types_1.FINGERPRINTABLE_WINDOW_APIS[key].includes(data.symbol));
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
                const standardEvent = fb_pixel_lookup_1.FB_STANDARD_EVENTS.filter(f => f.eventName === value);
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
                const description = fb_pixel_lookup_1.FB_ADVANCED_MATCHING_PARAMETERS[key];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGlDQUFrQztBQUNsQyxtRUFBdUU7QUFDdkUseURBQThFO0FBQzlFLHVEQUF3RjtBQUN4RixtQ0FRaUI7QUFDakIsbUNBQWdGO0FBRXpFLE1BQU0sY0FBYyxHQUFHLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLEVBQUU7SUFDakUsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNyRCxRQUFRLFVBQVUsRUFBRTtRQUNoQixLQUFLLFNBQVM7WUFDVixPQUFPLElBQUEsMEJBQWtCLEVBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN2RCxLQUFLLGFBQWE7WUFDZCxPQUFPLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZDLEtBQUssMkJBQTJCO1lBQzVCLE9BQU8sb0JBQW9CLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDM0MsS0FBSyx1QkFBdUI7WUFDeEIsT0FBTyxJQUFBLGtDQUEwQixFQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ2pELEtBQUssNEJBQTRCO1lBQzdCLE9BQU8sSUFBQSxzQ0FBOEIsRUFBQyxTQUFTLENBQUMsQ0FBQztRQUNyRCxLQUFLLGlCQUFpQjtZQUNsQixPQUFPLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzFDLEtBQUssMkJBQTJCO1lBQzVCLE9BQU8seUJBQXlCLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDaEQsS0FBSyxtQkFBbUI7WUFDcEIsT0FBTyxzQkFBc0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM3QyxLQUFLLHNCQUFzQjtZQUN2QixPQUFPLHdCQUF3QixDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNwRDtZQUNJLE9BQU8sRUFBRSxDQUFDO0tBQ2pCO0FB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