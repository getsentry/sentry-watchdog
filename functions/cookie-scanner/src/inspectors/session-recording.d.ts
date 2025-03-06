import { Page } from 'puppeteer';
import { BlacklightEvent } from '../types';
export declare const setupSessionRecordingInspector: (page: Page, eventDataHandler: (event: BlacklightEvent) => void) => Promise<void>;
