"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSessionRecordingInspector = void 0;
const statics_1 = require("../helpers/statics");
const setupSessionRecordingInspector = async (page, eventDataHandler) => {
    page.on('request', async (request) => {
        const parsedUrl = new URL(request.url());
        const cleanUrl = `${parsedUrl.hostname}${parsedUrl.pathname}`;
        const stack = [{ fileName: request.frame() ? request.frame().url() : '' }];
        // check if the request URL matches any known session recording service patterns
        const matches = statics_1.SESSION_RECORDERS_LIST.filter(session_recorder => cleanUrl.includes(session_recorder));
        if (matches.length > 0) {
            eventDataHandler({
                matches,
                stack,
                type: 'SessionRecording',
                url: cleanUrl
            });
        }
    });
};
exports.setupSessionRecordingInspector = setupSessionRecordingInspector;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Vzc2lvbi1yZWNvcmRpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZXNzaW9uLXJlY29yZGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxnREFBNEQ7QUFFckQsTUFBTSw4QkFBOEIsR0FBRyxLQUFLLEVBQUUsSUFBVSxFQUFFLGdCQUFrRCxFQUFFLEVBQUU7SUFDbkgsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFDLE9BQU8sRUFBQyxFQUFFO1FBQy9CLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sUUFBUSxHQUFHLEdBQUcsU0FBUyxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDOUQsTUFBTSxLQUFLLEdBQUcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUUzRSxnRkFBZ0Y7UUFDaEYsTUFBTSxPQUFPLEdBQUcsZ0NBQXNCLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztRQUN2RyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ3BCLGdCQUFnQixDQUFDO2dCQUNiLE9BQU87Z0JBQ1AsS0FBSztnQkFDTCxJQUFJLEVBQUUsa0JBQWtCO2dCQUN4QixHQUFHLEVBQUUsUUFBUTthQUNoQixDQUFDLENBQUM7U0FDTjtJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDO0FBakJXLFFBQUEsOEJBQThCLGtDQWlCekMifQ==