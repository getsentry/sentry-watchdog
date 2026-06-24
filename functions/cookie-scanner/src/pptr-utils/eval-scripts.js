"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectPlugins = injectPlugins;
function injectPlugins(jsInstruments, observerScripts, StackTraceJS, testing) {
    function sendMessagesToLogger(messages) {
        window.reportEvent(JSON.stringify(messages));
    }
    // WARN: This script makes the assumption that you have injected StackTrace js to the page context
    const { instrumentFunctionViaProxy, instrumentObject, instrumentObjectProperty } = jsInstruments(sendMessagesToLogger, StackTraceJS);
    if (testing) {
        window.instrumentFunctionViaProxy = instrumentFunctionViaProxy;
        window.instrumentObject = instrumentObject;
        window.instrumentObjectProperty = instrumentObjectProperty;
        console.log('Content-side javascript instrumentation started', new Date().toISOString());
    }
    for (const script of observerScripts) {
        console.log(`Initializing ${script.name ? script.name : 'anonymous'}`);
        script({
            instrumentFunctionViaProxy,
            instrumentObject,
            instrumentObjectProperty
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZhbC1zY3JpcHRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXZhbC1zY3JpcHRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsc0NBcUJDO0FBckJELFNBQWdCLGFBQWEsQ0FBQyxhQUFrQixFQUFFLGVBQW9CLEVBQUUsWUFBaUIsRUFBRSxPQUFnQjtJQUN2RyxTQUFTLG9CQUFvQixDQUFDLFFBQWE7UUFDdEMsTUFBYyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUNELGtHQUFrRztJQUNsRyxNQUFNLEVBQUUsMEJBQTBCLEVBQUUsZ0JBQWdCLEVBQUUsd0JBQXdCLEVBQUUsR0FBRyxhQUFhLENBQUMsb0JBQW9CLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDckksSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUNULE1BQWMsQ0FBQywwQkFBMEIsR0FBRywwQkFBMEIsQ0FBQztRQUN2RSxNQUFjLENBQUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUM7UUFDbkQsTUFBYyxDQUFDLHdCQUF3QixHQUFHLHdCQUF3QixDQUFDO1FBQ3BFLE9BQU8sQ0FBQyxHQUFHLENBQUMsaURBQWlELEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0lBQzdGLENBQUM7SUFFRCxLQUFLLE1BQU0sTUFBTSxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDdkUsTUFBTSxDQUFDO1lBQ0gsMEJBQTBCO1lBQzFCLGdCQUFnQjtZQUNoQix3QkFBd0I7U0FDM0IsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztBQUNMLENBQUMifQ==