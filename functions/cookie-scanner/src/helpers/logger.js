"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogger = void 0;
const path_1 = __importDefault(require("path"));
const tmp_1 = require("tmp");
// https://stackoverflow.com/a/45211015/1407622
const winston_1 = require("winston");
(0, tmp_1.setGracefulCleanup)();
const getLogger = ({ outDir = '', quiet = false }) => {
    const log_transports = [];
    log_transports.push(new winston_1.transports.Console({
        level: 'info',
        silent: quiet
    }));
    const filename = outDir ? path_1.default.join(outDir, 'inspection-log.ndjson') : (0, tmp_1.tmpNameSync)({ postfix: '-log.ndjson' });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibG9nZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLGdEQUF3QjtBQUN4Qiw2QkFBc0Q7QUFFdEQsK0NBQStDO0FBQy9DLHFDQUEyRDtBQUUzRCxJQUFBLHdCQUFrQixHQUFFLENBQUM7QUFFZCxNQUFNLFNBQVMsR0FBRyxDQUFDLEVBQUUsTUFBTSxHQUFHLEVBQUUsRUFBRSxLQUFLLEdBQUcsS0FBSyxFQUFFLEVBQUUsRUFBRTtJQUN4RCxNQUFNLGNBQWMsR0FBRyxFQUFFLENBQUM7SUFDMUIsY0FBYyxDQUFDLElBQUksQ0FDZixJQUFJLG9CQUFVLENBQUMsT0FBTyxDQUFDO1FBQ25CLEtBQUssRUFBRSxNQUFNO1FBQ2IsTUFBTSxFQUFFLEtBQUs7S0FDaEIsQ0FBQyxDQUNMLENBQUM7SUFFRixNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLGNBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUEsaUJBQVcsRUFBQyxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDO0lBRS9HLGNBQWMsQ0FBQyxJQUFJLENBQ2YsSUFBSSxvQkFBVSxDQUFDLElBQUksQ0FBQztRQUNoQixRQUFRO1FBQ1IsS0FBSyxFQUFFLE9BQU87UUFDZCxPQUFPLEVBQUUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUMsb0ZBQW9GO0tBQy9HLENBQUMsQ0FDTCxDQUFDO0lBRUYsT0FBTyxJQUFBLHNCQUFZLEVBQUM7UUFDaEIsK0NBQStDO1FBQy9DLE1BQU0sRUFBRSxnQkFBTSxDQUFDLE9BQU8sQ0FBQyxnQkFBTSxDQUFDLFNBQVMsRUFBRSxFQUFFLGdCQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDekQsVUFBVSxFQUFFLGNBQWM7S0FDN0IsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDO0FBeEJXLFFBQUEsU0FBUyxhQXdCcEIifQ==