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
    debug: true, // Keep track of the rule that matched a request
    enableOptimizations: false, // Required to return all information about block rule
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
            const { match, filter } = blocker.match((0, adblocker_puppeteer_1.fromPuppeteerDetails)(request));
            if (!match) {
                continue;
            }
            isBlocked = true;
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
            eventDataHandler({
                data: {
                    query,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhpcmQtcGFydHktdHJhY2tlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0aGlyZC1wYXJ0eS10cmFja2Vycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxvRUFBb0Y7QUFDcEYsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUl4Qjs7O0dBR0c7QUFFSCxNQUFNLGNBQWMsR0FBRztJQUNuQixLQUFLLEVBQUUsSUFBSSxFQUFFLGdEQUFnRDtJQUM3RCxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsc0RBQXNEO0lBQ2xGLG1CQUFtQixFQUFFLEtBQUssQ0FBQywyQ0FBMkM7Q0FDekUsQ0FBQztBQUVGLE1BQU0sUUFBUSxHQUFHO0lBQ2IsaUJBQWlCLEVBQUUsc0NBQWdCLENBQUMsS0FBSyxDQUFDLFlBQUUsQ0FBQyxZQUFZLENBQUMsY0FBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsdUNBQXVDLENBQUMsRUFBRSxNQUFNLENBQUMsRUFBRSxjQUFjLENBQUM7SUFDakosY0FBYyxFQUFFLHNDQUFnQixDQUFDLEtBQUssQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLGNBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLG9DQUFvQyxDQUFDLEVBQUUsTUFBTSxDQUFDLEVBQUUsY0FBYyxDQUFDO0NBQzlJLENBQUM7QUFFSyxNQUFNLGdDQUFnQyxHQUFHLEtBQUssRUFDakQsSUFBVSxFQUNWLGdCQUF1RCxFQUN2RCxhQUFhLEdBQUcsS0FBSyxFQUN2QixFQUFFO0lBQ0EsSUFBSSxhQUFhLEVBQUUsQ0FBQztRQUNoQixNQUFNLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFDLE9BQU8sRUFBQyxFQUFFO1FBQy9CLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztRQUV0QixLQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ3pELE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFBLDBDQUFvQixFQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFFdkUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNULFNBQVM7WUFDYixDQUFDO1lBRUQsU0FBUyxHQUFHLElBQUksQ0FBQztZQUVqQixNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUM7WUFDbkQsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBQ2pCLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztnQkFDMUMsSUFBSSxDQUFDO29CQUNELEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNuQyxDQUFDO2dCQUFDLE1BQU0sQ0FBQztvQkFDTCxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDO2dCQUN2QixDQUFDO1lBQ0wsQ0FBQztZQUVELGdCQUFnQixDQUFDO2dCQUNiLElBQUksRUFBRTtvQkFDRixLQUFLO29CQUNMLE1BQU0sRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFFO29CQUN6QixRQUFRO2lCQUNYO2dCQUNELEtBQUssRUFBRTtvQkFDSDt3QkFDSSxRQUFRLEVBQUUsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUU7d0JBQ3RDLE1BQU0sRUFBRSxrQ0FBa0M7cUJBQzdDO2lCQUNKO2dCQUNELElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFO2FBQ3JCLENBQUMsQ0FBQztZQUVILE1BQU07UUFDVixDQUFDO1FBRUQsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNoQixJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNaLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNwQixDQUFDO2lCQUFNLENBQUM7Z0JBQ0osT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3ZCLENBQUM7UUFDTCxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUM7QUExRFcsUUFBQSxnQ0FBZ0Msb0NBMEQzQyJ9