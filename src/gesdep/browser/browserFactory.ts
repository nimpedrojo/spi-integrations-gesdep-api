import { chromium, Browser } from 'playwright';
import { logger } from '../../shared/logger.js';
import { config } from '../../shared/config.js';

export const createBrowser = async (): Promise<Browser> => {
  logger.debug({ headless: config.GESDEP_HEADLESS }, 'Launching browser');
  return chromium.launch({ headless: config.GESDEP_HEADLESS });
};
