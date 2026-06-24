"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instrumentFingerprintingApis = void 0;
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
exports.instrumentFingerprintingApis = instrumentFingerprintingApis;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZ2VycHJpbnRpbmctYXBpcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpbmdlcnByaW50aW5nLWFwaXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsU0FBZ0IsNEJBQTRCLENBQUMsRUFBRSx3QkFBd0IsRUFBRSxnQkFBZ0IsRUFBRSwwQkFBMEIsRUFBRTtJQUNuSCxTQUFTLENBQUMsWUFBWSxDQUFDLGdCQUFnQixHQUFHLDBCQUEwQixDQUNoRSxNQUFNLENBQUMsU0FBUyxDQUFDLFlBQVksRUFDN0IsK0JBQStCLEVBQy9CLGtCQUFrQixDQUNyQixDQUFDO0lBQ0YsaUNBQWlDO0lBQ2pDLE1BQU0sbUJBQW1CLEdBQUc7UUFDeEIsYUFBYTtRQUNiLFNBQVM7UUFDVCxZQUFZO1FBQ1osV0FBVztRQUNYLGVBQWU7UUFDZixZQUFZO1FBQ1osYUFBYTtRQUNiLFVBQVU7UUFDVixXQUFXO1FBQ1gsUUFBUTtRQUNSLFVBQVU7UUFDVixTQUFTO1FBQ1QsWUFBWTtRQUNaLFdBQVc7UUFDWCxXQUFXO1FBQ1gsUUFBUTtLQUNYLENBQUM7SUFDRixtQkFBbUIsQ0FBQyxPQUFPLENBQUMsVUFBVSxRQUFRO1FBQzFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsa0JBQWtCLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDN0UsQ0FBQyxDQUFDLENBQUM7SUFFSCw4QkFBOEI7SUFDOUIsb0RBQW9EO0lBQ3BELE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQztJQUN6RSxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsVUFBVSxRQUFRO1FBQ3ZDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsZUFBZSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3ZFLENBQUMsQ0FBQyxDQUFDO0lBRUgsb0JBQW9CO0lBQ3BCLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxNQUFNLEVBQUUs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