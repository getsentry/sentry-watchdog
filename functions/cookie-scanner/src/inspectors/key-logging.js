"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupKeyLoggingInspector = void 0;
const interaction_utils_1 = require("../pptr-utils/interaction-utils");
const utils_1 = require("../helpers/utils");
const ts = [
    ...Object.values(interaction_utils_1.DEFAULT_INPUT_VALUES),
    ...Object.values((0, utils_1.getHashedValues)('base64', interaction_utils_1.DEFAULT_INPUT_VALUES)),
    ...Object.values((0, utils_1.getHashedValues)('md5', interaction_utils_1.DEFAULT_INPUT_VALUES)),
    ...Object.values((0, utils_1.getHashedValues)('sha256', interaction_utils_1.DEFAULT_INPUT_VALUES)),
    ...Object.values((0, utils_1.getHashedValues)('sha512', interaction_utils_1.DEFAULT_INPUT_VALUES))
];
const hashesMap = {
    base64: Object.values((0, utils_1.getHashedValues)('base64', interaction_utils_1.DEFAULT_INPUT_VALUES)),
    md5: Object.values((0, utils_1.getHashedValues)('md5', interaction_utils_1.DEFAULT_INPUT_VALUES)),
    plaintext: Object.values(interaction_utils_1.DEFAULT_INPUT_VALUES),
    sha256: Object.values((0, utils_1.getHashedValues)('sha256', interaction_utils_1.DEFAULT_INPUT_VALUES)),
    sha512: Object.values((0, utils_1.getHashedValues)('sha512', interaction_utils_1.DEFAULT_INPUT_VALUES))
};
const setupKeyLoggingInspector = async (page, eventDataHandler) => {
    page.on('request', (request) => {
        const stack = [
            {
                fileName: request.frame() ? request.frame().url() : '',
                source: `RequestHandler`
            }
        ];
        if (request.method() === 'POST') {
            try {
                let filter = [];
                filter = ts.filter((t) => request.postData().indexOf(t) > -1);
                if (filter.length > 0) {
                    let match_type = [];
                    filter.forEach(val => {
                        const m = Object.entries(hashesMap).filter(([, hashes]) => {
                            return hashes.indexOf(val) > -1;
                        });
                        match_type = match_type.concat(m.map(e => e[0]));
                    });
                    match_type = [...new Set(match_type)];
                    eventDataHandler({
                        data: {
                            filter,
                            match_type,
                            post_data: request.postData(),
                            post_request_url: request.url()
                        },
                        stack,
                        type: `KeyLogging`,
                        url: request.frame().url()
                    });
                }
            }
            catch (error) {
                eventDataHandler({
                    data: {
                        message: JSON.stringify(error)
                    },
                    stack,
                    type: `Error.KeyLogging`,
                    url: request.frame().url()
                });
            }
        }
    });
};
exports.setupKeyLoggingInspector = setupKeyLoggingInspector;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5LWxvZ2dpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJrZXktbG9nZ2luZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSx1RUFBdUU7QUFFdkUsNENBQW1EO0FBRW5ELE1BQU0sRUFBRSxHQUFHO0lBQ1AsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLHdDQUFvQixDQUFDO0lBQ3RDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFBLHVCQUFlLEVBQUMsUUFBUSxFQUFFLHdDQUFvQixDQUFDLENBQUM7SUFDakUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUEsdUJBQWUsRUFBQyxLQUFLLEVBQUUsd0NBQW9CLENBQUMsQ0FBQztJQUM5RCxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBQSx1QkFBZSxFQUFDLFFBQVEsRUFBRSx3Q0FBb0IsQ0FBQyxDQUFDO0lBQ2pFLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFBLHVCQUFlLEVBQUMsUUFBUSxFQUFFLHdDQUFvQixDQUFDLENBQUM7Q0FDcEUsQ0FBQztBQUVGLE1BQU0sU0FBUyxHQUFHO0lBQ2QsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBQSx1QkFBZSxFQUFDLFFBQVEsRUFBRSx3Q0FBb0IsQ0FBQyxDQUFDO0lBQ3RFLEdBQUcsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUEsdUJBQWUsRUFBQyxLQUFLLEVBQUUsd0NBQW9CLENBQUMsQ0FBQztJQUNoRSxTQUFTLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyx3Q0FBb0IsQ0FBQztJQUM5QyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFBLHVCQUFlLEVBQUMsUUFBUSxFQUFFLHdDQUFvQixDQUFDLENBQUM7SUFDdEUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBQSx1QkFBZSxFQUFDLFFBQVEsRUFBRSx3Q0FBb0IsQ0FBQyxDQUFDO0NBQ3pFLENBQUM7QUFF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