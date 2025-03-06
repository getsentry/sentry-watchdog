import { Page } from 'puppeteer';
import { instrumentAddEventListener } from '../plugins/add-event-listener';
import { BlacklightEvent } from '../types';
export declare const setupBlacklightInspector: (page: Page, eventDataHandler: (event: BlacklightEvent) => void, testing?: boolean, plugins?: (typeof instrumentAddEventListener)[]) => Promise<void>;
