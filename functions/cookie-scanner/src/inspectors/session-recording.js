"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSessionRecordingInspector = void 0;
const types_1 = require("../types");
const setupSessionRecordingInspector = async (page, eventDataHandler) => {
    page.on('request', async (request) => {
        const parsedUrl = new URL(request.url());
        const cleanUrl = `${parsedUrl.hostname}${parsedUrl.pathname}`;
        const stack = [
            {
                fileName: request.frame() ? request.frame().url() : ''
            }
        ];
        const matches = types_1.SESSION_RECORDERS_LIST.filter(s => cleanUrl.includes(s));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Vzc2lvbi1yZWNvcmRpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZXNzaW9uLXJlY29yZGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxvQ0FBbUU7QUFFNUQsTUFBTSw4QkFBOEIsR0FBRyxLQUFLLEVBQUUsSUFBVSxFQUFFLGdCQUFrRCxFQUFFLEVBQUU7SUFDbkgsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFDLE9BQU8sRUFBQyxFQUFFO1FBQy9CLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sUUFBUSxHQUFHLEdBQUcsU0FBUyxDQUFDLFFBQVEsR0FBRyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDOUQsTUFBTSxLQUFLLEdBQUc7WUFDVjtnQkFDSSxRQUFRLEVBQUUsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUU7YUFDekQ7U0FDSixDQUFDO1FBQ0YsTUFBTSxPQUFPLEdBQUcsOEJBQXNCLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pFLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDcEIsZ0JBQWdCLENBQUM7Z0JBQ2IsT0FBTztnQkFDUCxLQUFLO2dCQUNMLElBQUksRUFBRSxrQkFBa0I7Z0JBQ3hCLEdBQUcsRUFBRSxRQUFRO2FBQ2hCLENBQUMsQ0FBQztTQUNOO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUM7QUFuQlcsUUFBQSw4QkFBOEIsa0NBbUJ6QyJ9