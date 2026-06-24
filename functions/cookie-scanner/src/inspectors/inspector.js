"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupBlacklightInspector = void 0;
const fs_1 = require("fs");
const add_event_listener_1 = require("../plugins/add-event-listener");
const fingerprinting_apis_1 = require("../plugins/fingerprinting-apis");
const js_instrument_1 = require("../plugins/js-instrument");
const eval_scripts_1 = require("../pptr-utils/eval-scripts");
function getPageScriptAsString(observers, testing = false) {
    let observersString = '';
    let observersNameString = '';
    observers.forEach(obsv => {
        observersString += `${obsv}\n`;
        observersNameString += `${obsv.name},`;
    });
    return `${js_instrument_1.jsInstruments}\n${observersString}(${eval_scripts_1.injectPlugins}(jsInstruments,[${observersNameString}],StackTrace,${testing ? 'true' : 'false'}))`;
}
const setupBlacklightInspector = async (page, eventDataHandler, testing = false, plugins = [add_event_listener_1.instrumentAddEventListener, fingerprinting_apis_1.instrumentFingerprintingApis]) => {
    const stackTraceHelper = (0, fs_1.readFileSync)(require.resolve('stacktrace-js/dist/stacktrace.js'), 'utf8');
    await page.evaluateOnNewDocument(stackTraceHelper);
    await page.evaluateOnNewDocument(getPageScriptAsString(plugins, testing));
    await page.exposeFunction('reportEvent', eventData => {
        try {
            const parsed = JSON.parse(eventData);
            eventDataHandler(parsed);
        }
        catch (error) {
            eventDataHandler({
                data: {
                    message: JSON.stringify(eventData)
                },
                stack: [],
                type: `Error.BlacklightInspector`,
                url: ''
            });
        }
    });
};
exports.setupBlacklightInspector = setupBlacklightInspector;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zcGVjdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaW5zcGVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJCQUFrQztBQUVsQyxzRUFBMkU7QUFDM0Usd0VBQThFO0FBQzlFLDREQUF5RDtBQUN6RCw2REFBMkQ7QUFHM0QsU0FBUyxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsT0FBTyxHQUFHLEtBQUs7SUFDckQsSUFBSSxlQUFlLEdBQUcsRUFBRSxDQUFDO0lBQ3pCLElBQUksbUJBQW1CLEdBQUcsRUFBRSxDQUFDO0lBRTdCLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDckIsZUFBZSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUM7UUFDL0IsbUJBQW1CLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUM7SUFDM0MsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLEdBQUcsNkJBQWEsS0FBSyxlQUFlLElBQUksNEJBQWEsbUJBQW1CLG1CQUFtQixnQkFBZ0IsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDO0FBQ3JKLENBQUM7QUFFTSxNQUFNLHdCQUF3QixHQUFHLEtBQUssRUFDekMsSUFBVSxFQUNWLGdCQUFrRCxFQUNsRCxPQUFPLEdBQUcsS0FBSyxFQUNmLE9BQU8sR0FBRyxDQUFDLCtDQUEwQixFQUFFLGtEQUE0QixDQUFDLEVBQ3RFLEVBQUU7SUFDQSxNQUFNLGdCQUFnQixHQUFHLElBQUEsaUJBQVksRUFBQyxPQUFPLENBQUMsT0FBTyxDQUFDLGtDQUFrQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDbkcsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNuRCxNQUFNLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUUxRSxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxFQUFFO1FBQ2pELElBQUksQ0FBQztZQUNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDckMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDN0IsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDYixnQkFBZ0IsQ0FBQztnQkFDYixJQUFJLEVBQUU7b0JBQ0YsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDO2lCQUNyQztnQkFDRCxLQUFLLEVBQUUsRUFBRTtnQkFDVCxJQUFJLEVBQUUsMkJBQTJCO2dCQUNqQyxHQUFHLEVBQUUsRUFBRTthQUNWLENBQUMsQ0FBQztRQUNQLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQztBQXpCVyxRQUFBLHdCQUF3Qiw0QkF5Qm5DIn0=