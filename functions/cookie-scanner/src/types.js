"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FINGERPRINTABLE_WINDOW_APIS = exports.BEHAVIOUR_TRACKING_EVENTS = exports.SESSION_RECORDERS_LIST = void 0;
exports.SESSION_RECORDERS_LIST = [
    'mc.yandex.ru/metrika/watch.js',
    'mc.yandex.ru/metrika/tag.js',
    'mc.yandex.ru/webvisor/',
    'fullstory.com/s/fs.js',
    'd2oh4tlt9mrke9.cloudfront.net/Record/js/sessioncam.recorder.js',
    'ws.sessioncam.com/Record/record.asmx',
    'userreplay.net',
    'static.hotjar.com',
    'script.hotjar.com',
    'insights.hotjar.com/api',
    'clicktale.net',
    'smartlook.com',
    'decibelinsight.net',
    'quantummetric.com',
    'inspectlet.com',
    'mouseflow.com',
    'logrocket.com',
    'salemove.com',
    'd10lpsik1i8c69.cloudfront.net',
    'luckyorange.com',
    'vwo.com'
];
exports.BEHAVIOUR_TRACKING_EVENTS = {
    KEYBOARD: ['keydown', 'keypress', 'keyup', 'input'],
    MOUSE: ['click', 'mousedown', 'mouseup', 'mousemove', 'select', 'dblclick', 'scroll'],
    SENSOR: ['devicemotion', 'deviceorientation', 'orientationchange'],
    TOUCH: ['touchmove', 'touchstart', 'touchend', 'touchcancel']
};
exports.FINGERPRINTABLE_WINDOW_APIS = {
    AUDIO: [
        'AudioContext.createOscillator',
        'AudioContext.createAnalyser',
        'AudioContext.createBiquadFilter',
        'AudioContext.createBuffer',
        'AudioContext.createGain',
        'AudioContext.createScriptProcessor',
        'AudioContext.destination',
        'AnalyserNode.connect',
        'AnalyserNode.disconnect',
        'AnalyserNode.frequencyBinCount',
        'AnalyserNode.getFloatFrequencyData',
        'GainNode.connect',
        'GainNode.gain',
        'GainNode.disconnect',
        'OscillatorNode.type',
        'OscillatorNode.connect',
        'OscillatorNode.stop',
        'OscillatorNode.start',
        'ScriptProcessorNode.connect',
        'ScriptProcessorNode.onaudioprocess',
        'ScriptProcessorNode.disconnect'
    ],
    BATTERY: ['window.BatteryManager', 'window.navigator.getBattery'],
    CANVAS: [
        'CanvasRenderingContext2D.getImageData',
        'CanvasRenderingContext2D.fillText',
        'CanvasRenderingContext2D.strokeText',
        'CanvasRenderingContext2D.save',
        'HTMLCanvasElement.toDataURL',
        'HTMLCanvasElement.addEventListener'
    ],
    MEDIA_DEVICES: ['window.navigator.mediaDevices.enumerateDevices'],
    MIME: ['window.navigator.mimeTypes'],
    NAVIGATOR: [
        'window.navigator.appCodeName',
        'window.navigator.appName',
        'window.navigator.appVersion',
        'window.navigator.clipboard',
        'window.navigator.cookieEnabled',
        'window.navigator.doNotTrack',
        'window.navigator.geolocation',
        'window.navigator.language',
        'window.navigator.languages',
        'window.navigator.onLine',
        'window.navigator.platform',
        'window.navigator.product',
        'window.navigator.productSub',
        'window.navigator.userAgent',
        'window.navigator.vendorSub',
        'window.navigator.vendor'
    ],
    PLUGIN: ['window.navigator.plugins'],
    SCREEN: ['window.screen.pixelDepth', 'window.screen.colorDepth'],
    WEBRTC: ['RTCPeerConnection']
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0eXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFtRWEsUUFBQSxzQkFBc0IsR0FBRztJQUNsQywrQkFBK0I7SUFDL0IsNkJBQTZCO0lBQzdCLHdCQUF3QjtJQUN4Qix1QkFBdUI7SUFDdkIsZ0VBQWdFO0lBQ2hFLHNDQUFzQztJQUN0QyxnQkFBZ0I7SUFDaEIsbUJBQW1CO0lBQ25CLG1CQUFtQjtJQUNuQix5QkFBeUI7SUFDekIsZUFBZTtJQUNmLGVBQWU7SUFDZixvQkFBb0I7SUFDcEIsbUJBQW1CO0lBQ25CLGdCQUFnQjtJQUNoQixlQUFlO0lBQ2YsZUFBZTtJQUNmLGNBQWM7SUFDZCwrQkFBK0I7SUFDL0IsaUJBQWlCO0lBQ2pCLFNBQVM7Q0FDWixDQUFDO0FBQ1csUUFBQSx5QkFBeUIsR0FBRztJQUNyQyxRQUFRLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUM7SUFDbkQsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDO0lBQ3JGLE1BQU0sRUFBRSxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsQ0FBQztJQUNsRSxLQUFLLEVBQUUsQ0FBQyxXQUFXLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxhQUFhLENBQUM7Q0FDaEUsQ0FBQztBQUVXLFFBQUEsMkJBQTJCLEdBQUc7SUFDdkMsS0FBSyxFQUFFO1FBQ0gsK0JBQStCO1FBQy9CLDZCQUE2QjtRQUM3QixpQ0FBaUM7UUFDakMsMkJBQTJCO1FBQzNCLHlCQUF5QjtRQUN6QixvQ0FBb0M7UUFDcEMsMEJBQTBCO1FBQzFCLHNCQUFzQjtRQUN0Qix5QkFBeUI7UUFDekIsZ0NBQWdDO1FBQ2hDLG9DQUFvQztRQUNwQyxrQkFBa0I7UUFDbEIsZUFBZTtRQUNmLHFCQUFxQjtRQUNyQixxQkFBcUI7UUFDckIsd0JBQXdCO1FBQ3hCLHFCQUFxQjtRQUNyQixzQkFBc0I7UUFDdEIsNkJBQTZCO1FBQzdCLG9DQUFvQztRQUNwQyxnQ0FBZ0M7S0FDbkM7SUFDRCxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsRUFBRSw2QkFBNkIsQ0FBQztJQUNqRSxNQUFNLEVBQUU7UUFDSix1Q0FBdUM7UUFDdkMsbUNBQW1DO1FBQ25DLHFDQUFxQztRQUNyQywrQkFBK0I7UUFDL0IsNkJBQTZCO1FBQzdCLG9DQUFvQztLQUN2QztJQUNELGFBQWEsRUFBRSxDQUFDLGdEQUFnRCxDQUFDO0lBQ2pFLElBQUksRUFBRSxDQUFDLDRCQUE0QixDQUFDO0lBQ3BDLFNBQVMsRUFBRTtRQUNQLDhCQUE4QjtRQUM5QiwwQkFBMEI7UUFDMUIsNkJBQTZCO1FBQzdCLDRCQUE0QjtRQUM1QixnQ0FBZ0M7UUFDaEMsNkJBQTZCO1FBQzdCLDhCQUE4QjtRQUM5QiwyQkFBMkI7UUFDM0IsNEJBQTRCO1FBQzVCLHlCQUF5QjtRQUN6QiwyQkFBMkI7UUFDM0IsMEJBQTBCO1FBQzFCLDZCQUE2QjtRQUM3Qiw0QkFBNEI7UUFDNUIsNEJBQTRCO1FBQzVCLHlCQUF5QjtLQUM1QjtJQUNELE1BQU0sRUFBRSxDQUFDLDBCQUEwQixDQUFDO0lBQ3BDLE1BQU0sRUFBRSxDQUFDLDBCQUEwQixFQUFFLDBCQUEwQixDQUFDO0lBQ2hFLE1BQU0sRUFBRSxDQUFDLG1CQUFtQixDQUFDO0NBQ2hDLENBQUMifQ==