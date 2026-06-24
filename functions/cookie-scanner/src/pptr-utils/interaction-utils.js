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
    'cc-exp': '01/2026',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJhY3Rpb24tdXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbnRlcmFjdGlvbi11dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFYSxRQUFBLG9CQUFvQixHQUFHO0lBQ2hDLElBQUksRUFBRSxZQUFZO0lBQ2xCLEtBQUssRUFBRSxtQ0FBbUM7SUFDMUMsUUFBUSxFQUFFLHNCQUFzQjtJQUNoQyxNQUFNLEVBQUUsV0FBVztJQUNuQixJQUFJLEVBQUUsZUFBZTtJQUNyQixHQUFHLEVBQUUsdUJBQXVCO0lBQzVCLFlBQVksRUFBRSxZQUFZO0lBQzFCLG9CQUFvQixFQUFFLHFCQUFxQjtJQUMzQyxrQkFBa0IsRUFBRSx5QkFBeUI7SUFDN0MsY0FBYyxFQUFFLHFCQUFxQjtJQUNyQyxRQUFRLEVBQUUsZ0JBQWdCO0lBQzFCLGFBQWEsRUFBRSxTQUFTO0lBQ3hCLFlBQVksRUFBRSxRQUFRO0lBQ3RCLElBQUksRUFBRSxlQUFlO0lBQ3JCLGdCQUFnQixFQUFFLGNBQWM7SUFDaEMsZUFBZSxFQUFFLGNBQWM7SUFDL0IsYUFBYSxFQUFFLE9BQU87SUFDdEIsU0FBUyxFQUFFLGVBQWU7SUFDMUIsZUFBZSxFQUFFLFFBQVE7SUFDekIsZ0JBQWdCLEVBQUUsU0FBUztJQUMzQixXQUFXLEVBQUUsa0JBQWtCO0lBQy9CLFFBQVEsRUFBRSxTQUFTO0lBQ25CLFNBQVMsRUFBRSxNQUFNO0lBQ2pCLG9CQUFvQixFQUFFLFVBQVU7SUFDaEMsSUFBSSxFQUFFLFlBQVk7SUFDbEIsR0FBRyxFQUFFLFFBQVE7SUFDYixHQUFHLEVBQUUsYUFBYTtJQUNsQixjQUFjLEVBQUUsY0FBYztJQUM5QixJQUFJLEVBQUUsd0NBQXdDO0lBQzlDLHlDQUF5QztDQUM1QyxDQUFDO0FBRUssTUFBTSxTQUFTLEdBQUcsS0FBSyxFQUFFLElBQVUsRUFBRSxPQUFPLEdBQUcsSUFBSSxFQUFFLEVBQUU7SUFDMUQsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFDO0lB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