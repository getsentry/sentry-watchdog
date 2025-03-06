import { Page } from 'puppeteer';
import { TrackingRequestEvent } from '../types';
export declare const setUpThirdPartyTrackersInspector: (
    page: Page,
    eventDataHandler: (event: TrackingRequestEvent) => void,
    enableAdBlock?: boolean
) => Promise<void>;
