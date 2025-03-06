import * as fs from 'fs';
import { join } from 'path';

interface ScanReport {
    cookies: {
        [key: string]: string[]; // key is "name/domain", value is array of URLs where cookie was found
    };
    fb_pixel_events: {
        [key: string]: string[];
    };
    key_logging: {
        [key: string]: string[];
    };
    session_recorders: {
        [key: string]: string[];
    };
    third_party_trackers: {
        [key: string]: string[];
    };
}

export async function aggregateReports(): Promise<string> {
    const reportDir = join(__dirname, '..', 'scan_reports');
    const aggregatedReport: ScanReport = {
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
            const reportPath = join(reportDir, file);
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
        } catch (error) {
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
