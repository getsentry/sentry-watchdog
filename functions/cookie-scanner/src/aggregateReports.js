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
            ;
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