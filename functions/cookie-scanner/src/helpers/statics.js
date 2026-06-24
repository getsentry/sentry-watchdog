"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TWITTER_STANDARD_EVENTS = exports.TWITTER_ADVANCED_MATCHING_PARAMETERS = exports.TIKTOK_ADVANCED_MATCHING_PARAMETERS = exports.TIKTOK_STANDARD_EVENTS = exports.SOCIAL_URLS = exports.FB_STANDARD_EVENTS = exports.FB_ADVANCED_MATCHING_PARAMETERS = exports.SESSION_RECORDERS_LIST = exports.FINGERPRINTABLE_WINDOW_APIS = exports.BEHAVIOUR_TRACKING_EVENTS = void 0;
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
// Facebook Statics
// https://web.archive.org/web/20200413102542/https://developers.facebook.com/docs/facebook-pixel/advanced/advanced-matching
exports.FB_ADVANCED_MATCHING_PARAMETERS = {
    'ud[em]': 'Email',
    'ud[fn]': 'First Name',
    'ud[ln]': 'Last Name',
    'ud[ph]': 'Phone',
    'ud[ge]': 'Gender',
    'ud[db]': 'Birthdate',
    'ud[city]': 'City',
    'ud[ct]': 'City',
    'ud[state]': 'State or Province',
    'ud[st]': 'State or Province',
    'ud[zp]': 'Zip Code',
    'ud[cn]': 'Country',
    'ud[country]': 'Country',
    'ud[external_id]': 'An ID from another database.'
};
// https://web.archive.org/web/20200519201636/https://developers.facebook.com/docs/facebook-pixel/reference
exports.FB_STANDARD_EVENTS = [
    {
        eventDescription: `When payment information is added in the checkout flow. For example - A person clicks on a save billing information button`,
        eventName: 'AddPaymentInfo'
    },
    {
        eventDescription: `When a product is added to the shopping cart. For example - A person clicks on an add to cart button.`,
        eventName: 'AddToCart'
    },
    {
        eventDescription: 'When a product is added to a wishlist. For example - A person clicks on an add to wishlist button. ',
        eventName: 'AddToWishlist'
    },
    {
        eventDescription: 'When a registration form is completed. For example - A person submits a completed subscription or signup form.',
        eventName: 'CompleteRegistration'
    },
    {
        eventDescription: 'When a person initiates contact with your business via telephone, SMS, email, chat, etc. For example - A person submits a question about a product',
        eventName: 'Contact'
    },
    {
        eventDescription: 'When a person customizes a product. For example - A person selects the color of a t-shirt.',
        eventName: 'CustomizeProduct'
    },
    {
        eventDescription: 'When a person donates funds to your organization or cause. For example - A person adds a donation to the Humane Society to their cart',
        eventName: 'Donate'
    },
    {
        eventDescription: 'When a person searches for a location of your store via a website or app, with an intention to visit the physical location. For example - A person wants to find a specific product in a local store. ',
        eventName: 'FindLocation'
    },
    {
        eventDescription: 'When a person enters the checkout flow prior to completing the checkout flow. For example - A person clicks on a checkout button.',
        eventName: 'InitiateCheckout'
    },
    {
        eventDescription: 'When a sign up is completed. For example - A person clicks on pricing.',
        eventName: 'Lead'
    },
    {
        eventDescription: 'This is the default pixel tracking page visits. For example - A person lands on your website pages.',
        eventName: 'PageView'
    },
    {
        eventDescription: 'When a purchase is made or checkout flow is completed. A person has finished the purchase or checkout flow and lands on thank you or confirmation page',
        eventName: 'Purchase'
    },
    {
        eventDescription: 'When a person books an appointment to visit one of your locations. A person selects a date and time for a dentist appointment.',
        eventName: 'Schedule'
    },
    {
        eventDescription: 'When a search is made. A person searches for a product on your website.',
        eventName: 'Search'
    },
    {
        eventDescription: 'When a person starts a free trial of a product or service you offer. A person selects a free week of your game',
        eventName: 'StartTrial'
    },
    {
        eventDescription: 'When a person applies for a product, service, or program you offer. For example - A person applies for a credit card, educational program, or job. ',
        eventName: 'SubmitApplication'
    },
    {
        eventDescription: 'When a person applies to a start a paid subscription for a product or service you offer.',
        eventName: 'Subscribe'
    },
    {
        eventDescription: "A visit to a web page you care about (for example, a product page or landing page). ViewContent tells you if someone visits a web page's URL, but not what they see or do on that page. For example - A person lands on a product details page",
        eventName: 'ViewContent'
    }
];
exports.SOCIAL_URLS = [
    'facebook\\.com',
    'linkedin\\.com',
    'twitter\\.com',
    'youtube\\.com',
    'instagram\\.com',
    'flickr\\.com',
    'tumblr\\.com',
    'snapchat\\.com',
    'whatsapp\\.com',
    'docs\\.google\\.com',
    'goo\\.gl',
    'pinterest\\.com',
    'bit\\.ly',
    'evernote\\.com',
    'eventbrite\\.com',
    'dropbox\\.com',
    'slideshare\\.net',
    'vimeo\\.com',
    'x\\.com',
    'bsky\\.app',
    'tiktok\\.com',
    'mastodon\\.social',
    'threads\\.net',
    'wechat\\.com',
    'messenger\\.com',
    'telegram\\.org',
    'douyin\\.com',
    'kuaishou\\.com',
    'weibo\\.com',
    'im\\.qq\\.com'
];
// https://web.archive.org/web/20250901012520/https://ads.tiktok.com/help/article/standard-events-parameters?lang=en
exports.TIKTOK_STANDARD_EVENTS = [
    { eventDescription: 'When a visitor adds their payment information at checkout.', eventName: 'AddPaymentInfo' },
    { eventDescription: 'When a visitor adds an item to the cart.', eventName: 'AddToCart' },
    { eventDescription: 'When a visitor adds an item to the wishlist.', eventName: 'AddToWishlist' },
    { eventDescription: 'When an application submitted by a user is approved (e.g. loan, job, enrollment).', eventName: 'ApplicationApproval' },
    { eventDescription: 'When a visitor signs up / completes registration.', eventName: 'CompleteRegistration' },
    { eventDescription: 'When a visitor contacts you.', eventName: 'Contact' },
    { eventDescription: 'When a visitor customizes a product.', eventName: 'CustomizeProduct' },
    { eventDescription: 'When a visitor downloads something from your website.', eventName: 'Download' },
    { eventDescription: 'When a visitor looks for location.', eventName: 'FindLocation' },
    { eventDescription: 'When a visitor proceeds to checkout.', eventName: 'InitiateCheckout' },
    { eventDescription: 'When a visitor makes a purchase.', eventName: 'Purchase' },
    { eventDescription: 'When a visitor schedules an appointment.', eventName: 'Schedule' },
    { eventDescription: 'When a visitor searches for something.', eventName: 'Search' },
    { eventDescription: 'When a customer begins a free trial.', eventName: 'StartTrial' },
    { eventDescription: 'When someone submits an application (e.g. for credit, job, admission).', eventName: 'SubmitApplication' },
    { eventDescription: 'When a visitor submits a form.', eventName: 'SubmitForm' },
    { eventDescription: 'When a visitor subscribes (e.g. to content or paid subscription).', eventName: 'Subscribe' },
    { eventDescription: 'When a visitor views a specific content page.', eventName: 'ViewContent' },
    { eventDescription: 'This is the default pixel tracking page visits.', eventName: 'Pageview' }
];
// https://business-api.tiktok.com/portal/docs?rid=5ipocbxyw8v&id=1739585700402178
// https://web.archive.org/web/20251204192306/https://business-api.tiktok.com/portal/docs?rid=5ipocbxyw8v&id=1739585700402178
exports.TIKTOK_ADVANCED_MATCHING_PARAMETERS = {
    'email': 'Email',
    'phone_number': 'Phone Number',
    'external_id': 'Unique ID from the advertiser',
    'anonymous_id': 'a unique identifier to track users for whom no other identifiable information is available'
};
// https://web.archive.org/web/20251012013043/https://business.x.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites
exports.TWITTER_ADVANCED_MATCHING_PARAMETERS = {
    'email': 'Email',
    'phone_number': 'Phone Number',
};
// https://web.archive.org/web/20251012013043/https://business.x.com/en/help/campaign-measurement-and-analytics/conversion-tracking-for-websites
exports.TWITTER_STANDARD_EVENTS = [
    { eventDescription: 'When a user views a page on the website.', eventName: 'pageview' },
    { eventDescription: 'When a user completes a purchase.', eventName: 'purchase' },
    { eventDescription: 'When a user downloads a file or content.', eventName: 'download' },
    { eventDescription: 'When a user becomes a lead or submits a contact form.', eventName: 'lead' },
    { eventDescription: 'When a user adds an item to their shopping cart.', eventName: 'addtocart' },
    { eventDescription: 'When a user begins the checkout process.', eventName: 'checkoutinitiated' },
    { eventDescription: 'When a user views a specific piece of content.', eventName: 'contentview' },
    { eventDescription: 'When a user enters or saves payment information.', eventName: 'addedpaymentinfo' },
    { eventDescription: 'When a user performs a search on the website.', eventName: 'search' },
    { eventDescription: 'When a user subscribes to a service, newsletter, or plan.', eventName: 'subscribe' },
    { eventDescription: 'When a user begins a free or paid trial.', eventName: 'starttrial' },
    { eventDescription: 'When a user adds an item to their wishlist.', eventName: 'addtowishlist' },
    { eventDescription: 'When a user customizes a product’s options or features.', eventName: 'productcustomization' }
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGljcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInN0YXRpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQWEsUUFBQSx5QkFBeUIsR0FBRztJQUNyQyxRQUFRLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUM7SUFDbkQsS0FBSyxFQUFFLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsUUFBUSxDQUFDO0lBQ3JGLE1BQU0sRUFBRSxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsQ0FBQztJQUNsRSxLQUFLLEVBQUUsQ0FBQyxXQUFXLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxhQUFhLENBQUM7Q0FDaEUsQ0FBQztBQUVXLFFBQUEsMkJBQTJCLEdBQUc7SUFDdkMsS0FBSyxFQUFFO1FBQ0gsK0JBQStCO1FBQy9CLDZCQUE2QjtRQUM3QixpQ0FBaUM7UUFDakMsMkJBQTJCO1FBQzNCLHlCQUF5QjtRQUN6QixvQ0FBb0M7UUFDcEMsMEJBQTBCO1FBQzFCLHNCQUFzQjtRQUN0Qix5QkFBeUI7UUFDekIsZ0NBQWdDO1FBQ2hDLG9DQUFvQztRQUNwQyxrQkFBa0I7UUFDbEIsZUFBZTtRQUNmLHFCQUFxQjtRQUNyQixxQkFBcUI7UUFDckIsd0JBQXdCO1FBQ3hCLHFCQUFxQjtRQUNyQixzQkFBc0I7UUFDdEIsNkJBQTZCO1FBQzdCLG9DQUFvQztRQUNwQyxnQ0FBZ0M7S0FDbkM7SUFDRCxPQUFPLEVBQUUsQ0FBQyx1QkFBdUIsRUFBRSw2QkFBNkIsQ0FBQztJQUNqRSxNQUFNLEVBQUU7UUFDSix1Q0FBdUM7UUFDdkMsbUNBQW1DO1FBQ25DLHFDQUFxQztRQUNyQywrQkFBK0I7UUFDL0IsNkJBQTZCO1FBQzdCLG9DQUFvQztLQUN2QztJQUNELGFBQWEsRUFBRSxDQUFDLGdEQUFnRCxDQUFDO0lBQ2pFLElBQUks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