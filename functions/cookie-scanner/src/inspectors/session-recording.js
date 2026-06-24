"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSessionRecordingInspector = void 0;
const statics_1 = require("../helpers/statics");
const setupSessionRecordingInspector = async (page, eventDataHandler) => {
    page.on('request', async (request) => {
        const parsedUrl = new URL(request.url());
        const cleanUrl = `${parsedUrl.hostname}${parsedUrl.pathname}`;
        const stack = [{ fileName: request.frame() ? request.frame().url() : '' }];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Vzc2lvbi1yZWNvcmRpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZXNzaW9uLXJlY29yZGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxnREFBNEQ7QUFFckQsTUFBTSw4QkFBOEIsR0FBRyxLQUFLLEVBQUUsSUFBVSxFQUFFLGdCQUFrRCxFQUFFLEVBQUU7SUFDbkgsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFDLE9BQU8sRUFBQyxFQUFFO1FBQy9CLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sUUFBUSxHQUFHLEdBQUcsU0FBUyxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDOUQsTUFBTSxLQUFLLEdBQUcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUUzRSxNQUFNLE9BQU8sR0FBRyxnQ0FBc0IsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1FBQ3ZHLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDcEIsZ0JBQWdCLENBQUM7Z0JBQ2IsT0FBTztnQkFDUCxLQUFLO2dCQUNMLElBQUksRUFBRSxrQkFBa0I7Z0JBQ3hCLEdBQUcsRUFBRSxRQUFRO2FBQ2hCLENBQUMsQ0FBQztTQUNOO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUM7QUFoQlcsUUFBQSw4QkFBOEIsa0NBZ0J6QyJ9