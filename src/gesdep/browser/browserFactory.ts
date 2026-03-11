import { chromium, Browser } from 'playwright';
import { logger } from '../../shared/logger.js';

export const createBrowser = async (): Promise<Browser> => {
  logger.debug('Launching headless browser');
  return chromium.launch({ headless: true });
};
