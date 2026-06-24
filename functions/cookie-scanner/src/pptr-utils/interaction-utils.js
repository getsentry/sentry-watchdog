"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoScroll = exports.fillForms = exports.DEFAULT_INPUT_VALUES = void 0;
exports.DEFAULT_INPUT_VALUES = {
    date: '01/01/2026',
    email: 'blacklight-headless@themarkup.org',
    password: 'SUPERS3CR3T_PASSWORD',
    search: 'TheMarkup',
    text: 'IdaaaaTarbell',
    url: 'https://themarkup.org',
    organization: 'The Markup',
    'organization-title': 'Non-profit newsroom',
    'current-password': 'S3CR3T_CURRENT_PASSWORD',
    'new-password': 'S3CR3T_NEW_PASSWORD',
    username: 'idaaaa_tarbell',
    'family-name': 'Tarbell',
    'given-name': 'Idaaaa',
    name: 'IdaaaaTarbell',
    'street-address': 'PO Box #1103',
    'address-line1': 'PO Box #1103',
    'postal-code': '10159',
    'cc-name': 'IDAAAATARBELL',
    'cc-given-name': 'IDAAAA',
    'cc-family-name': 'TARBELL',
    'cc-number': '4479846060020724',
    'cc-exp': '01/2026', // "MM/YY" or "MM/YYYY".
    'cc-type': 'Visa',
    'transaction-amount': '13371337',
    bday: '01-01-1970',
    sex: 'Female',
    tel: '+1971112233',
    'tel-national': '917-111-2233',
    impp: 'xmpp:blacklight-headless@themarkup.org'
    // ... [rest of the default input values]
};
const fillForms = async (page, timeout = 6000) => {
    let isInteracting = false;
    const timeoutPromise = new Promise(resolve => {
        setTimeout(() => {
            if (isInteracting) {
                return;
            }
            resolve('Timeout');
        }, timeout);
    });
    const fillPromise = async () => {
        // console.log('Entering fillPromise.');
        try {
            if (!page.isClosed()) {
                // console.log('Checking for inputs on the page');
                const elements = await page.$$('input');
                // console.log(`Found ${elements.length} input elements`);
                let count = 0;
                for (const el of elements) {
                    if (!page.isClosed()) {
                        isInteracting = true;
                        if (count > 100) {
                            break;
                        }
                        count += 1;
                        const pHandle = await el.getProperty('type');
                        const pValue = await pHandle.jsonValue();
                        const autoCompleteHandle = await el.getProperty('autocomplete');
                        const autoCompleteValue = (await autoCompleteHandle.jsonValue());
                        let autoCompleteKeys = [];
                        if (autoCompleteValue) {
                            if (autoCompleteValue.includes('cc-name')) {
                                autoCompleteKeys = ['cc-name'];
                            }
                            else {
                                autoCompleteKeys = Object.keys(exports.DEFAULT_INPUT_VALUES).filter(k => autoCompleteValue.includes(k));
                            }
                        }
                        if (pValue === 'submit' || pValue === 'hidden') {
                            continue;
                        }
                        else if (autoCompleteKeys.length > 0) {
                            await el.focus();
                            await page.keyboard.press('Tab', {
                                delay: 100
                            });
                            await el.press('Backspace');
                            await page.keyboard.type(exports.DEFAULT_INPUT_VALUES[autoCompleteKeys[0]]);
                        }
                        else if (Object.keys(exports.DEFAULT_INPUT_VALUES).includes(pValue)) {
                            await el.focus();
                            await page.keyboard.press('Tab', {
                                delay: 100
                            });
                            await el.press('Backspace');
                            await page.keyboard.type(exports.DEFAULT_INPUT_VALUES[pValue]);
                        }
                        isInteracting = false;
                    }
                    else {
                        // console.log('Page is closed. Exiting loop.');
                        break;
                    }
                }
            }
            else {
                // console.log('Page is closed. Exiting fillForms.');
            }
        }
        catch (error) {
            if (error.message.includes('Execution context was destroyed')) {
                console.log('Page navigated away while interacting. Continuing...');
            }
            else {
                console.error(`Error in fillForms: ${error.message}`);
            }
        }
        finally {
            // console.log('Done with fillForms');
        }
    };
    return await Promise.race([timeoutPromise, fillPromise()]);
};
exports.fillForms = fillForms;
const autoScroll = async (page) => {
    await page.evaluate(async () => {
        return new Promise((resolve, reject) => {
            try {
                let totalHeight = 0;
                const distance = 150;
                const COUNT_MAX = 5;
                let count = 0;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    count += 1;
                    if (totalHeight >= scrollHeight || count > COUNT_MAX) {
                        clearInterval(timer);
                        resolve(undefined);
                    }
                }, 100);
            }
            catch (error) {
                reject(error);
            }
        });
    });
};
exports.autoScroll = autoScroll;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJhY3Rpb24tdXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbnRlcmFjdGlvbi11dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFYSxRQUFBLG9CQUFvQixHQUFHO0lBQ2hDLElBQUksRUFBRSxZQUFZO0lBQ2xCLEtBQUssRUFBRSxtQ0FBbUM7SUFDMUMsUUFBUSxFQUFFLHNCQUFzQjtJQUNoQyxNQUFNLEVBQUUsV0FBVztJQUNuQixJQUFJLEVBQUUsZUFBZTtJQUNyQixHQUFHLEVBQUUsdUJBQXVCO0lBQzVCLFlBQVksRUFBRSxZQUFZO0lBQzFCLG9CQUFvQixFQUFFLHFCQUFxQjtJQUMzQyxrQkFBa0IsRUFBRSx5QkFBeUI7SUFDN0MsY0FBYyxFQUFFLHFCQUFxQjtJQUNyQyxRQUFRLEVBQUUsZ0JBQWdCO0lBQzFCLGFBQWEsRUFBRSxTQUFTO0lBQ3hCLFlBQVksRUFBRSxRQUFRO0lBQ3RCLElBQUksRUFBRSxlQUFlO0lBQ3JCLGdCQUFnQixFQUFFLGNBQWM7SUFDaEMsZUFBZSxFQUFFLGNBQWM7SUFDL0IsYUFBYSxFQUFFLE9BQU87SUFDdEIsU0FBUyxFQUFFLGVBQWU7SUFDMUIsZUFBZSxFQUFFLFFBQVE7SUFDekIsZ0JBQWdCLEVBQUUsU0FBUztJQUMzQixXQUFXLEVBQUUsa0JBQWtCO0lBQy9CLFFBQVEsRUFBRSxTQUFTLEVBQUUsd0JBQXdCO0lBQzdDLFNBQVMsRUFBRSxNQUFNO0lBQ2pCLG9CQUFvQixFQUFFLFVBQVU7SUFDaEMsSUFBSSxFQUFFLFlBQVk7SUFDbEIsR0FBRyxFQUFFLFFBQVE7SUFDYixHQUFHLEVBQUUsYUFBYTtJQUNsQixjQUFjLEVBQUUsY0FBYztJQUM5QixJQUFJLEVBQUUsd0NBQXdDO0lBQzlDLHlDQUF5QztDQUM1QyxDQUFDO0FBRUssTUFBTSxTQUFTLEdBQUcsS0FBSyxFQUFFLElBQVUsRUFBRSxPQUFPLEdBQUcsSUFBSSxFQUFFLEVBQUU7SUFDMUQsSUFBSSxhQUFhLEdBQUcs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