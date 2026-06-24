"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateReports = aggregateReports;
const fs = __importStar(require("fs"));
const path_1 = require("path");
const os = __importStar(require("os"));
async function aggregateReports(customConfig) {
    var _a, _b, _c, _d, _e, _f;
    const reportDir = (0, path_1.join)(os.tmpdir(), customConfig.output.reportDir);
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    const aggregatedReport = {
        cookies: {},
        fb_pixel_events: {},
        key_logging: {},
        session_recorders: {},
        third_party_trackers: {}
    };
    // Read all JSON files in the scan_reports directory
    const files = fs.readdirSync(reportDir).filter(file => file.endsWith('.json'));
    for (const file of files) {
        try {
            const reportPath = (0, path_1.join)(reportDir, file);
            const reportContent = fs.readFileSync(reportPath, 'utf8');
            const report = JSON.parse(reportContent);
            // Get the URL from the report
            const url = report.uri_ins;
            if (!url) {
                console.error(`Report file ${file} has no URL`);
                continue;
            }
            // Process cookies from the report
            if (report.reports.cookies && Array.isArray(report.reports.cookies)) {
                for (const cookie of report.reports.cookies) {
                    if (cookie.name && cookie.domain) {
                        const cookieKey = `${cookie.name}/${cookie.domain}`;
                        (_a = aggregatedReport.cookies)[cookieKey] || (_a[cookieKey] = []);
                        // Only add URL if it's not already in the list
                        if (!aggregatedReport.cookies[cookieKey].includes(url)) {
                            aggregatedReport.cookies[cookieKey].push(url);
                        }
                    }
                }
            }
            // Process fb_pixel_events from the report
            if (report.reports.fb_pixel_events && Array.isArray(report.reports.fb_pixel_events)) {
                for (const event of report.reports.fb_pixel_events) {
                    if (event.name && event.domain) {
                        const eventKey = `${event.name}/${event.domain}`;
                        (_b = aggregatedReport.fb_pixel_events)[eventKey] || (_b[eventKey] = []);
                        if (!aggregatedReport.fb_pixel_events[eventKey].includes(url)) {
                            aggregatedReport.fb_pixel_events[eventKey].push(url);
                        }
                    }
                }
            }
            // Process key_logging from the report
            if (report.reports.key_logging && Array.isArray(report.reports.key_logging)) {
                for (const logging of report.reports.key_logging) {
                    if (logging.name && logging.domain) {
                        const loggingKey = `${logging.name}/${logging.domain}`;
                        (_c = aggregatedReport.key_logging)[loggingKey] || (_c[loggingKey] = []);
                        if (!aggregatedReport.key_logging[loggingKey].includes(url)) {
                            aggregatedReport.key_logging[loggingKey].push(url);
                        }
                    }
                }
            }
            // Process session_recorders from the report
            if (report.reports.session_recorders && Array.isArray(report.reports.session_recorders)) {
                for (const recorder of report.reports.session_recorders) {
                    if (recorder.name && recorder.domain) {
                        const recorderKey = `${recorder.name}/${recorder.domain}`;
                        (_d = aggregatedReport.session_recorders)[recorderKey] || (_d[recorderKey] = []);
                        if (!aggregatedReport.session_recorders[recorderKey].includes(url)) {
                            aggregatedReport.session_recorders[recorderKey].push(url);
                        }
                    }
                }
            }
            // Process third_party_trackers from the report
            if (report.reports.third_party_trackers && Array.isArray(report.reports.third_party_trackers)) {
                for (const tracker of report.reports.third_party_trackers) {
                    (_e = aggregatedReport.third_party_trackers)[_f = tracker.data.filter] || (_e[_f] = []);
                    if (!aggregatedReport.third_party_trackers[tracker.data.filter].includes(url)) {
                        aggregatedReport.third_party_trackers[tracker.data.filter].push(url);
                    }
                }
            }
        }
        catch (error) {
            console.error(`Error processing report file ${file}:`, error);
        }
    }
    // // Sort URLs for each cookie
    // for (const key in aggregatedReport) {
    //     aggregatedReport[key].sort();
    // }
    // // Sort cookie keys
    // const sortedReport = Object.keys(aggregatedReport)
    //     .sort()
    //     .reduce((obj: ScanReport, key) => {
    //         obj[key] = aggregatedReport[key];
    //         return obj;
    //     }, {});
    // // Write the aggregated report
    // const outputPath = join(__dirname, '..', 'cookies.json');
    // fs.writeFileSync(
    //     outputPath,
    //     JSON.stringify(aggregatedReport, null, 2),
    //     'utf8'
    // );
    return JSON.stringify(aggregatedReport);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdncmVnYXRlUmVwb3J0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFnZ3JlZ2F0ZVJlcG9ydHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFzQkEsNENBaUlDO0FBdkpELHVDQUF5QjtBQUN6QiwrQkFBNEI7QUFFNUIsdUNBQXlCO0FBbUJsQixLQUFLLFVBQVUsZ0JBQWdCLENBQUMsWUFBMkI7O0lBQzlELE1BQU0sU0FBUyxHQUFHLElBQUEsV0FBSSxFQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBRW5FLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7UUFDNUIsRUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRUQsTUFBTSxnQkFBZ0IsR0FBZTtRQUNqQyxPQUFPLEVBQUUsRUFBRTtRQUNYLGVBQWUsRUFBRSxFQUFFO1FBQ25CLFdBQVcsRUFBRSxFQUFFO1FBQ2YsaUJBQWlCLEVBQUUsRUFBRTtRQUNyQixvQkFBb0IsRUFBRSxFQUFFO0tBQzNCLENBQUM7SUFFRixvREFBb0Q7SUFDcEQsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFFL0UsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUN2QixJQUFJLENBQUM7WUFDRCxNQUFNLFVBQVUsR0FBRyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDekMsTUFBTSxhQUFhLEdBQUcsRUFBRSxDQUFDLFlB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