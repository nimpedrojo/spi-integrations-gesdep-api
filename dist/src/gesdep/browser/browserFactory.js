import { chromium } from 'playwright';
import { logger } from '../../shared/logger.js';
export const createBrowser = async () => {
    logger.debug('Launching headless browser');
    return chromium.launch({ headless: true });
};
