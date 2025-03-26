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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateReports = void 0;
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
exports.aggregateReports = aggregateReports;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdncmVnYXRlUmVwb3J0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFnZ3JlZ2F0ZVJlcG9ydHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsK0JBQTRCO0FBRTVCLHVDQUF5QjtBQW1CbEIsS0FBSyxVQUFVLGdCQUFnQixDQUFDLFlBQTJCOztJQUM5RCxNQUFNLFNBQVMsR0FBRyxJQUFBLFdBQUksRUFBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUVsRSxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRTtRQUMzQixFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0tBQ2hEO0lBRUQsTUFBTSxnQkFBZ0IsR0FBZTtRQUNqQyxPQUFPLEVBQUUsRUFBRTtRQUNYLGVBQWUsRUFBRSxFQUFFO1FBQ25CLFdBQVcsRUFBRSxFQUFFO1FBQ2YsaUJBQWlCLEVBQUUsRUFBRTtRQUNyQixvQkFBb0IsRUFBRSxFQUFFO0tBQzNCLENBQUM7SUFFRixvREFBb0Q7SUFDcEQsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFFL0UsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7UUFDdEIsSUFBSTtZQUNBLE1BQU0sVUFBVSxHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN6QyxNQUFNLGFBQWEsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUMxRCxNQUFN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