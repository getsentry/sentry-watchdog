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
async function aggregateReports() {
    const reportDir = (0, path_1.join)(__dirname, '..', 'scan_reports');
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
                        if (!aggregatedReport.cookies[cookieKey]) {
                            aggregatedReport.cookies[cookieKey] = [];
                        }
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
                        if (!aggregatedReport.fb_pixel_events[eventKey]) {
                            aggregatedReport.fb_pixel_events[eventKey] = [];
                        }
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
                        if (!aggregatedReport.key_logging[loggingKey]) {
                            aggregatedReport.key_logging[loggingKey] = [];
                        }
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
                        if (!aggregatedReport.session_recorders[recorderKey]) {
                            aggregatedReport.session_recorders[recorderKey] = [];
                        }
                        if (!aggregatedReport.session_recorders[recorderKey].includes(url)) {
                            aggregatedReport.session_recorders[recorderKey].push(url);
                        }
                    }
                }
            }
            // Process third_party_trackers from the report
            if (report.reports.third_party_trackers && Array.isArray(report.reports.third_party_trackers)) {
                for (const tracker of report.reports.third_party_trackers) {
                    if (!aggregatedReport.third_party_trackers[tracker.data.filter]) {
                        aggregatedReport.third_party_trackers[tracker.data.filter] = [];
                    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdncmVnYXRlUmVwb3J0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFnZ3JlZ2F0ZVJlcG9ydHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsK0JBQTRCO0FBb0JyQixLQUFLLFVBQVUsZ0JBQWdCO0lBQ2xDLE1BQU0sU0FBUyxHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDeEQsTUFBTSxnQkFBZ0IsR0FBZTtRQUNqQyxPQUFPLEVBQUUsRUFBRTtRQUNYLGVBQWUsRUFBRSxFQUFFO1FBQ25CLFdBQVcsRUFBRSxFQUFFO1FBQ2YsaUJBQWlCLEVBQUUsRUFBRTtRQUNyQixvQkFBb0IsRUFBRSxFQUFFO0tBQzNCLENBQUM7SUFFRixvREFBb0Q7SUFDcEQsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFFL0UsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7UUFDdEIsSUFBSTtZQUNBLE1BQU0sVUFBVSxHQUFHLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUN6QyxNQUFNLGFBQWEsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUMxRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBRXpDLDhCQUE4QjtZQUM5QixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO1lBQzNCLElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQ04sT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLElBQUksYUFBYSxDQUFDLENBQUM7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