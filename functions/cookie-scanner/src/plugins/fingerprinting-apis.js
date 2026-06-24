"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instrumentFingerprintingApis = instrumentFingerprintingApis;
function instrumentFingerprintingApis({ instrumentObjectProperty, instrumentObject, instrumentFunctionViaProxy }) {
    navigator.mediaDevices.enumerateDevices = instrumentFunctionViaProxy(window.navigator.mediaDevices, 'window.navigator.mediaDevices', 'enumerateDevices');
    // Access to navigator properties
    const navigatorProperties = [
        'appCodeName',
        'appName',
        'appVersion',
        'clipboard',
        'cookieEnabled',
        'doNotTrack',
        'geolocation',
        'language',
        'languages',
        'onLine',
        'platform',
        'product',
        'productSub',
        'userAgent',
        'vendorSub',
        'vendor'
    ];
    navigatorProperties.forEach(function (property) {
        instrumentObjectProperty(window.navigator, 'window.navigator', property);
    });
    // Access to screen properties
    // instrumentObject(window.screen, "window.screen");
    const screenProperties = ['width', 'height', 'pixelDepth', 'colorDepth'];
    screenProperties.forEach(function (property) {
        instrumentObjectProperty(window.screen, 'window.screen', property);
    });
    // Access to plugins
    const pluginProperties = ['name', 'filename', 'description', 'version', 'length'];
    for (let i = 0; i < window.navigator.plugins.length; i++) {
        const pluginName = window.navigator.plugins[i].name;
        pluginProperties.forEach(function (property) {
            instrumentObjectProperty(window.navigator.plugins[pluginName], 'window.navigator.plugins[' + pluginName + ']', property);
        });
    }
    // Access to MIMETypes
    const mimeTypeProperties = ['description', 'suffixes', 'type'];
    for (let i = 0; i < window.navigator.mimeTypes.length; i++) {
        const mimeTypeName = window.navigator.mimeTypes[i].type; // note: upstream typings seems to be incorrect
        mimeTypeProperties.forEach(function (property) {
            instrumentObjectProperty(window.navigator.mimeTypes[mimeTypeName], 'window.navigator.mimeTypes[' + mimeTypeName + ']', property);
        });
    }
    // Name, localStorage, and sessionsStorage logging
    // Instrumenting window.localStorage directly doesn't seem to work, so the Storage
    // prototype must be instrumented instead. Unfortunately this fails to differentiate
    // between sessionStorage and localStorage. Instead, you'll have to look for a sequence
    // of a get for the localStorage object followed by a getItem/setItem for the Storage object.
    const windowProperties = ['name', 'localStorage', 'sessionStorage'];
    windowProperties.forEach(function (property) {
        instrumentObjectProperty(window, 'window', property);
    });
    instrumentObject(window.Storage.prototype, 'window.Storage');
    // Access to document.cookie
    instrumentObjectProperty(window.document, 'window.document', 'cookie');
    // Access to document.referrer
    instrumentObjectProperty(window.document, 'window.document', 'referrer');
    // Access to canvas
    instrumentObject(window.HTMLCanvasElement.prototype, 'HTMLCanvasElement');
    const excludedProperties = [
        'quadraticCurveTo',
        'lineTo',
        'transform',
        'globalAlpha',
        'moveTo',
        'drawImage',
        'setTransform',
        'clearRect',
        'closePath',
        'beginPath',
        'canvas',
        'translate'
    ];
    instrumentObject(window.CanvasRenderingContext2D.prototype, 'CanvasRenderingContext2D', { excludedProperties });
    // Access to webRTC
    instrumentObject(window.RTCPeerConnection.prototype, 'RTCPeerConnection');
    // Access to Audio API
    instrumentObject(window.AudioContext.prototype, 'AudioContext');
    instrumentObject(window.OfflineAudioContext.prototype, 'OfflineAudioContext');
    instrumentObject(window.OscillatorNode.prototype, 'OscillatorNode');
    instrumentObject(window.AnalyserNode.prototype, 'AnalyserNode');
    instrumentObject(window.GainNode.prototype, 'GainNode');
    instrumentObject(window.ScriptProcessorNode.prototype, 'ScriptProcessorNode');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZ2VycHJpbnRpbmctYXBpcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpbmdlcnByaW50aW5nLWFwaXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxvRUFtR0M7QUFuR0QsU0FBZ0IsNEJBQTRCLENBQUMsRUFBRSx3QkFBd0IsRUFBRSxnQkFBZ0IsRUFBRSwwQkFBMEIsRUFBRTtJQUNuSCxTQUFTLENBQUMsWUFBWSxDQUFDLGdCQUFnQixHQUFHLDBCQUEwQixDQUNoRSxNQUFNLENBQUMsU0FBUyxDQUFDLFlBQVksRUFDN0IsK0JBQStCLEVBQy9CLGtCQUFrQixDQUNyQixDQUFDO0lBQ0YsaUNBQWlDO0lBQ2pDLE1BQU0sbUJBQW1CLEdBQUc7UUFDeEIsYUFBYTtRQUNiLFNBQVM7UUFDVCxZQUFZO1FBQ1osV0FBVztRQUNYLGVBQWU7UUFDZixZQUFZO1FBQ1osYUFBYTtRQUNiLFVBQVU7UUFDVixXQUFXO1FBQ1gsUUFBUTtRQUNSLFVBQVU7UUFDVixTQUFTO1FBQ1QsWUFBWTtRQUNaLFdBQVc7UUFDWCxXQUFXO1FBQ1gsUUFBUTtLQUNYLENBQUM7SUFDRixtQkFBbUIsQ0FBQyxPQUFPLENBQUMsVUFBVSxRQUFRO1FBQzFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsa0JBQWtCLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDN0UsQ0FBQyxDQUFDLENBQUM7SUFFSCw4QkFBOEI7SUFDOUIsb0RBQW9EO0lBQ3BELE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQztJQUN6RSxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsVUFBVSxRQUFRO1FBQ3ZDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsZUFBZSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3ZFLENBQUMsQ0FBQyxDQUFDO0lBRUgsb0JBQW9CO0lBQ3BCLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDbEYsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ3ZELE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNwRCxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsVUFBVSxRQUFRO1lBQ3ZDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLDJCQUEyQixHQUFHLFVBQVUsR0FBRyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDN0gsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRUQsc0JBQXNCO0lBQ3RCLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxhQUFhLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQy9ELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUN6RCxNQUFNLFlBQVksR0FBSSxNQUFNLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQXlCLENBQUMsSUFBSSxDQUFDLENBQUMsK0NBQStDO1FBQ2pJLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxVQUFVLFFBQVE7WUFDekMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEVBQUUsNkJBQTZCLEdBQUcsWUFBWSxHQUFHLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNySSxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFDRCxrREFBa0Q7SUFDbEQsa0ZBQWtGO0lBQ2xGLG9GQUFvRjtJQUNwRix1RkFBdUY7SUFDdkYsNkZBQTZGO0lBQzdGLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxNQUFNLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDcEUsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFVBQVUsUUFBUTtRQUN2Qyx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3pELENBQUMsQ0FBQyxDQUFDO0lBQ0gsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztJQUU3RCw0QkFBNEI7SUFDNUIsd0JBQXdCLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUV2RSw4QkFBOEI7SUFDOUIsd0JBQXdCLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUV6RSxtQkFBbUI7SUFDbkIsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0lBRTFFLE1BQU0sa0JBQWtCLEdBQUc7UUFDdkIsa0JBQWtCO1FBQ2xCLFFBQVE7UUFDUixXQUFXO1FBQ1gsYUFBYTtRQUNiLFFBQVE7UUFDUixXQUFXO1FBQ1gsY0FBYztRQUNkLFdBQVc7UUFDWCxXQUFXO1FBQ1gsV0FBVztRQUNYLFFBQVE7UUFDUixXQUFXO0tBQ2QsQ0FBQztJQUNGLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLEVBQUUsMEJBQTBCLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxDQUFDLENBQUM7SUFFaEgsbUJBQW1CO0lBQ25CLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztJQUUxRSxzQkFBc0I7SUFDdEIsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDaEUsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0lBQzlFLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFDcEUsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDaEUsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDeEQsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO0FBQ2xGLENBQUMifQ==