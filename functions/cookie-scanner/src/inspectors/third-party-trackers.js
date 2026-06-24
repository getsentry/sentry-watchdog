"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUpThirdPartyTrackersInspector = void 0;
const adblocker_puppeteer_1 = require("@cliqz/adblocker-puppeteer");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * @fileoverview
 * @see https://github.com/EU-EDPS/website-evidence-collector/blob/f75ef3ea7ff1be24940c4c33218c900afcf31979/lib/setup-beacon-recording.js
 */
const blockerOptions = {
    debug: true,
    enableOptimizations: false,
    loadCosmeticFilters: false // We're only interested in network filters
};
const blockers = {
    'easyprivacy.txt': adblocker_puppeteer_1.PuppeteerBlocker.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '../../data/blocklists/easyprivacy.txt'), 'utf8'), blockerOptions),
    'easylist.txt': adblocker_puppeteer_1.PuppeteerBlocker.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, '../../data/blocklists/easylist.txt'), 'utf8'), blockerOptions)
};
const setUpThirdPartyTrackersInspector = async (page, eventDataHandler, enableAdBlock = false) => {
    if (enableAdBlock) {
        await page.setRequestInterception(true);
    }
    page.on('request', async (request) => {
        let isBlocked = false;
        for (const [listName, blocker] of Object.entries(blockers)) {
            // if any request match the third party rules
            const { match, filter } = blocker.match((0, adblocker_puppeteer_1.fromPuppeteerDetails)(request));
            if (!match) {
                continue;
            }
            isBlocked = true;
            // handle get methods requests
            const params = new URL(request.url()).searchParams;
            const query = {};
            for (const [key, value] of params.entries()) {
                try {
                    query[key] = JSON.parse(value);
                }
                catch {
                    query[key] = value;
                }
            }
            // handle post methods requests
            let body = {};
            const postData = request.postData();
            if (postData) {
                try {
                    body = JSON.parse(postData);
                }
                catch {
                    // Non-JSON body (e.g. URL-encoded form data): parse into an object so
                    // downstream report filters that inspect body keys (e.g. TikTok's `event`)
                    // keep working instead of receiving a raw string they can't read.
                    body = Object.fromEntries(new URLSearchParams(postData));
                }
            }
            eventDataHandler({
                data: {
                    query,
                    body,
                    filter: filter.toString(),
                    listName
                },
                stack: [
                    {
                        fileName: request.frame()?.url() ?? '',
                        source: 'ThirdPartyTracker RequestHandler'
                    }
                ],
                type: 'TrackingRequest',
                url: request.url()
            });
            break;
        }
        if (enableAdBlock) {
            if (isBlocked) {
                request.abort();
            }
            else {
                request.continue();
            }
        }
    });
};
exports.setUpThirdPartyTrackersInspector = setUpThirdPartyTrackersInspector;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhpcmQtcGFydHktdHJhY2tlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0aGlyZC1wYXJ0eS10cmFja2Vycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxvRUFBb0Y7QUFDcEYsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUl4Qjs7O0dBR0c7QUFFSCxNQUFNLGNBQWMsR0FBRztJQUNuQixLQUFLLEVBQUUsSUFBSTtJQUNYLG1CQUFtQixFQUFFLEtBQUs7SUFDMUIsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLDJDQUEyQztDQUN6RSxDQUFDO0FBRUYsTUFBTSxRQUFRLEdBQUc7SUFDYixpQkFBaUIsRUFBRSxzQ0FBZ0IsQ0FBQyxLQUFLLENBQUMsWUFBRSxDQUFDLFlBQVksQ0FBQyxjQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSx1Q0FBdUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxFQUFFLGNBQWMsQ0FBQztJQUNqSixjQUFjLEVBQUUsc0NBQWdCLENBQUMsS0FBSyxDQUFDLFlBQUUsQ0FBQyxZQUFZLENBQUMsY0FBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsb0NBQW9DLENBQUMsRUFBRSxNQUFNLENBQUMsRUFBRSxjQUFjLENBQUM7Q0FDOUksQ0FBQztBQUVLLE1BQU0sZ0NBQWdDLEdBQUcsS0FBSyxFQUNqRCxJQUFVLEVBQ1YsZ0JBQXVELEVBQ3ZELGFBQWEsR0FBRyxLQUFLLEVBQ3ZCLEVBQUU7SUFDQSxJQUFJLGFBQWEsRUFBRTtRQUNmLE1BQU0sSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFDO0tBQzNDO0lBRUQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFDLE9BQU8sRUFBQyxFQUFFO1FBQy9CLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztRQUV0QixLQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUN4RCw2Q0FBNkM7WUFDN0MsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUEsMENBQW9CLEVBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUV2RSxJQUFJLENBQUMsS0FBSyxFQUFFO2dCQUNSLFNBQVM7YUFDWjtZQUVELFNBQVMsR0FBRyxJQUFJLENBQUM7WUFFakIsOEJBQThCO1lBQzlCLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQztZQUNuRCxNQUFNLEtBQUssR0FBRyxFQUFFLENBQUM7WUFDakIsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDekMsSUFBSTtvQkFDQSxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDbEM7Z0JBQUMsTUFBTTtvQkFDSixLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDO2lCQUN0QjthQUNKO1lBRUQsK0JBQStCO1lBQy9CLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQTtZQUNiLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwQyxJQUFJLFFBQVEsRUFBRTtnQkFDVixJQUFJO29CQUNBLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2lCQUMvQjtnQkFBQyxNQUFNO29CQUNKLHNFQUFzRTtvQkFDdEUsMkVBQTJFO29CQUMzRSxrRUFBa0U7b0JBQ2xFLElBQUksR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7aUJBQzVEO2FBQ0o7WUFFRCxnQkFBZ0IsQ0FBQztnQkFDYixJQUFJLEVBQUU7b0JBQ0YsS0FBSztvQkFDTCxJQUFJO29CQUNKLE1BQU0sRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFFO29CQUN6QixRQUFRO2lCQUNYO2dCQUNELEtBQUssRUFBRTtvQkFDSDt3QkFDSSxRQUFRLEVBQUUsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUU7d0JBQ3RDLE1BQU0sRUFBRSxrQ0FBa0M7cUJBQzdDO2lCQUNKO2dCQUNELElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFO2FBQ3JCLENBQUMsQ0FBQztZQUVILE1BQU07U0FDVDtRQUVELElBQUksYUFBYSxFQUFFO1lBQ2YsSUFBSSxTQUFTLEVBQUU7Z0JBQ1gsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO2FBQ25CO2lCQUFNO2dCQUNILE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQzthQUN0QjtTQUNKO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUM7QUEzRVcsUUFBQSxnQ0FBZ0Msb0NBMkUzQyJ9