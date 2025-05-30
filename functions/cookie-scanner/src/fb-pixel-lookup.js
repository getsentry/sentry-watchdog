"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FB_STANDARD_EVENTS = exports.FB_ADVANCED_MATCHING_PARAMETERS = void 0;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmItcGl4ZWwtbG9va3VwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmItcGl4ZWwtbG9va3VwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRIQUE0SDtBQUMvRyxRQUFBLCtCQUErQixHQUFHO0lBQzNDLFFBQVEsRUFBRSxPQUFPO0lBQ2pCLFFBQVEsRUFBRSxZQUFZO0lBQ3RCLFFBQVEsRUFBRSxXQUFXO0lBQ3JCLFFBQVEsRUFBRSxPQUFPO0lBQ2pCLFFBQVEsRUFBRSxRQUFRO0lBQ2xCLFFBQVEsRUFBRSxXQUFXO0lBQ3JCLFVBQVUsRUFBRSxNQUFNO0lBQ2xCLFFBQVEsRUFBRSxNQUFNO0lBQ2hCLFdBQVcsRUFBRSxtQkFBbUI7SUFDaEMsUUFBUSxFQUFFLG1CQUFtQjtJQUM3QixRQUFRLEVBQUUsVUFBVTtJQUNwQixRQUFRLEVBQUUsU0FBUztJQUNuQixhQUFhLEVBQUUsU0FBUztJQUN4QixpQkFBaUIsRUFBRSw4QkFBOEI7Q0FDcEQsQ0FBQztBQUVGLDJHQUEyRztBQUM5RixRQUFBLGtCQUFrQixHQUFHO0lBQzlCO1FBQ0ksZ0JBQWdCLEVBQUUsNEhBQTRIO1FBQzlJLFNBQVMsRUFBRSxnQkFBZ0I7S0FDOUI7SUFDRDtRQUNJLGdCQUFnQixFQUFFLHVHQUF1RztRQUN6SCxTQUFTLEVBQUUsV0FBVztLQUN6QjtJQUNEO1FBQ0ksZ0JBQWdCLEVBQUUscUdBQXFHO1FBQ3ZILFNBQVMsRUFBRSxlQUFlO0tBQzdCO0lBQ0Q7UUFDSSxnQkFBZ0IsRUFBRSxnSEFBZ0g7UUFDbEksU0FBUyxFQUFFLHNCQUFzQjtLQUNwQztJQUNEO1FBQ0ksZ0JBQWdCLEVBQ1osb0pBQW9KO1FBQ3hKLFNBQVMsRUFBRSxTQUFTO0tBQ3ZCO0lBQ0Q7UUFDSSxnQkFBZ0IsRUFBRSw0RkFBNEY7UUFDOUcsU0FBUyxFQUFFLGtCQUFrQjtLQUNoQztJQUNEO1FBQ0ksZ0JBQWdCLEVBQ1osdUlBQXVJO1FBQzNJLFNBQVMsRUFBRSxRQUFRO0tBQ3RCO0lBQ0Q7UUFDSSxnQkFBZ0IsRUFDWix3TUFBd007UUFDNU0sU0FBUyxFQUFFLGNBQWM7S0FDNUI7SUFDRDtRQUNJLGdCQUFnQixFQUNaLG1JQUFtSTtRQUN2SSxTQUFTLEVBQUUsa0JBQWtCO0tBQ2hDO0lBQ0Q7UUFDSSxnQkFBZ0IsRUFBRSx3RUFBd0U7UUFDMUYsU0FBUyxFQUFFLE1BQU07S0FDcEI7SUFDRDtRQUNJLGdCQUFnQixFQUFFLHFHQUFxRztRQUN2SCxTQUFTLEVBQUUsVUFBVTtLQUN4QjtJQUNEO1FBQ0ksZ0JBQWdCLEVBQ1osd0pBQXdKO1FBQzVKLFNBQVMsRUFBRSxVQUFVO0tBQ3hCO0lBQ0Q7UUFDSSxnQkFBZ0IsRUFDWixnSUFBZ0k7UUFDcEksU0FBUyxFQUFFLFVBQVU7S0FDeEI7SUFDRDtRQUNJLGdCQUFnQixFQUFFLHlFQUF5RTtRQUMzRixTQUFTLEVBQUUsUUFBUTtLQUN0QjtJQUNEO1FBQ0ksZ0JBQWdCLEVBQUUsZ0hBQWdIO1FBQ2xJLFNBQVMsRUFBRSxZQUFZO0tBQzFCO0lBQ0Q7UUFDSSxnQkFBZ0IsRUFDWixxSkFBcUo7UUFDekosU0FBUyxFQUFFLG1CQUFtQjtLQUNqQztJQUNEO1FBQ0ksZ0JBQWdCLEVBQUUsMEZBQTBGO1FBQzVHLFNBQVMsRUFBRSxXQUFXO0tBQ3pCO0lBQ0Q7UUFDSSxnQkFBZ0IsRUFDWixnUEFBZ1A7UUFDcFAsU0FBUyxFQUFFLGFBQWE7S0FDM0I7Q0FDSixDQUFDIn0=