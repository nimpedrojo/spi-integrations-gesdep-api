import { Browser, BrowserContext, chromium, Page } from 'playwright';
import { config } from '../shared/config.js';
import { ExternalServiceError } from '../shared/errors.js';
import { logger } from '../shared/logger.js';

/**
 * Session manager for Gesdep automation.
 * - Lazily creates a single browser/context.
 * - Headless mode is env-driven (GESDEP_HEADLESS).
 * - Call dispose() to close cleanly.
 */
export class SessionManager {
  private browser?: Browser;
  private context?: BrowserContext;

  async init(): Promise<BrowserContext> {
    if (this.context) return this.context;

    logger.info({ headless: config.GESDEP_HEADLESS }, 'Launching Playwright browser');
    try {
      this.browser = await chromium.launch({ headless: config.GESDEP_HEADLESS });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Playwright launch error';

      if (message.includes("Executable doesn't exist")) {
        throw new ExternalServiceError('Playwright browser is not installed. Run `npm run install:browsers` and retry.', {
          headless: config.GESDEP_HEADLESS
        });
      }

      throw error;
    }

    this.context = await this.browser.newContext({
      baseURL: config.GESDEP_BASE_URL
    });

    return this.context;
  }

  async newPage(): Promise<Page> {
    const ctx = await this.init();
    return ctx.newPage();
  }

  async dispose(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = undefined;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
    logger.info('Browser resources disposed');
  }
}
