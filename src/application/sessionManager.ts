import { Browser, BrowserContext, chromium, Page } from 'playwright';
import { config } from '../shared/config.js';
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
    this.browser = await chromium.launch({ headless: config.GESDEP_HEADLESS });
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
