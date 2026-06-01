"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogger = void 0;
const tmp_1 = require("tmp");
const utils_1 = require("./utils");
// https://stackoverflow.com/a/45211015/1407622
const winston_1 = require("winston");
(0, tmp_1.setGracefulCleanup)();
const getLogger = ({ outDir = '', quiet = false }) => {
    const log_transports = [];
    log_transports.push(new winston_1.transports.Console({
        level: 'info',
        silent: quiet
    }));
    const filename = outDir ? (0, utils_1.safePath)(outDir, 'inspection-log.ndjson') : (0, tmp_1.tmpNameSync)({ postfix: '-log.ndjson' });
    log_transports.push(new winston_1.transports.File({
        filename,
        level: 'silly',
        options: { flags: 'w' } // overwrite instead of append, see https://github.com/winstonjs/winston/issues/1271
    }));
    return (0, winston_1.createLogger)({
        // https://stackoverflow.com/a/48573091/1407622
        format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.json()),
        transports: log_transports
    });
};
exports.getLogger = getLogger;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibG9nZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZCQUFzRDtBQUN0RCxtQ0FBbUM7QUFFbkMsK0NBQStDO0FBQy9DLHFDQUEyRDtBQUUzRCxJQUFBLHdCQUFrQixHQUFFLENBQUM7QUFFZCxNQUFNLFNBQVMsR0FBRyxDQUFDLEVBQUUsTUFBTSxHQUFHLEVBQUUsRUFBRSxLQUFLLEdBQUcsS0FBSyxFQUFFLEVBQUUsRUFBRTtJQUN4RCxNQUFNLGNBQWMsR0FBRyxFQUFFLENBQUM7SUFDMUIsY0FBYyxDQUFDLElBQUksQ0FDZixJQUFJLG9CQUFVLENBQUMsT0FBTyxDQUFDO1FBQ25CLEtBQUssRUFBRSxNQUFNO1FBQ2IsTUFBTSxFQUFFLEtBQUs7S0FDaEIsQ0FBQyxDQUNMLENBQUM7SUFFRixNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUEsZ0JBQVEsRUFBQyxNQUFNLEVBQUUsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBQSxpQkFBVyxFQUFDLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUM7SUFFOUcsY0FBYyxDQUFDLElBQUksQ0FDZixJQUFJLG9CQUFVLENBQUMsSUFBSSxDQUFDO1FBQ2hCLFFBQVE7UUFDUixLQUFLLEVBQUUsT0FBTztRQUNkLE9BQU8sRUFBRSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxvRkFBb0Y7S0FDL0csQ0FBQyxDQUNMLENBQUM7SUFFRixPQUFPLElBQUEsc0JBQVksRUFBQztRQUNoQiwrQ0FBK0M7UUFDL0MsTUFBTSxFQUFFLGdCQUFNLENBQUMsT0FBTyxDQUFDLGdCQUFNLENBQUMsU0FBUyxFQUFFLEVBQUUsZ0JBQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN6RCxVQUFVLEVBQUUsY0FBYztLQUM3QixDQUFDLENBQUM7QUFDUCxDQUFDLENBQUM7QUF4QlcsUUFBQSxTQUFTLGFBd0JwQiJ9