"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogger = void 0;
const path_1 = __importDefault(require("path"));
const tmp_1 = require("tmp");
(0, tmp_1.setGracefulCleanup)();
// https://stackoverflow.com/a/45211015/1407622
const winston_1 = require("winston");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibG9nZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLGdEQUF3QjtBQUN4Qiw2QkFBc0Q7QUFDdEQsSUFBQSx3QkFBa0IsR0FBRSxDQUFDO0FBRXJCLCtDQUErQztBQUMvQyxxQ0FBMkQ7QUFFcEQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxFQUFFLE1BQU0sR0FBRyxFQUFFLEVBQUUsS0FBSyxHQUFHLEtBQUssRUFBRSxFQUFFLEVBQUU7SUFDeEQsTUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDO0lBQzFCLGNBQWMsQ0FBQyxJQUFJLENBQ2YsSUFBSSxvQkFBVSxDQUFDLE9BQU8sQ0FBQztRQUNuQixLQUFLLEVBQUUsTUFBTTtRQUNiLE1BQU0sRUFBRSxLQUFLO0tBQ2hCLENBQUMsQ0FDTCxDQUFDO0lBRUYsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxjQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFBLGlCQUFXLEVBQUMsRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQztJQUUvRyxjQUFjLENBQUMsSUFBSSxDQUNmLElBQUksb0JBQVUsQ0FBQyxJQUFJLENBQUM7UUFDaEIsUUFBUTtRQUNSLEtBQUssRUFBRSxPQUFPO1FBQ2QsT0FBTyxFQUFFLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLG9GQUFvRjtLQUMvRyxDQUFDLENBQ0wsQ0FBQztJQUVGLE9BQU8sSUFBQSxzQkFBWSxFQUFDO1FBQ2hCLCtDQUErQztRQUMvQyxNQUFNLEVBQUUsZ0JBQU0sQ0FBQyxPQUFPLENBQUMsZ0JBQU0sQ0FBQyxTQUFTLEVBQUUsRUFBRSxnQkFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3pELFVBQVUsRUFBRSxjQUFjO0tBQzdCLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQztBQXhCVyxRQUFBLFNBQVMsYUF3QnBCIn0=