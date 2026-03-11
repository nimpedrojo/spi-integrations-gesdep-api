import { BrowserContext, Page } from 'playwright';
import { createBrowser } from '../browser/browserFactory.js';
import { selectors } from '../selectors/index.js';
import { ExternalServiceError } from '../../shared/errors.js';
import { logger } from '../../shared/logger.js';

export interface LoginCredentials {
  username: string;
  password: string;
}

export class GesdepClient {
  private browserContext?: BrowserContext;

  async init() {
    if (!this.browserContext) {
      const browser = await createBrowser();
      this.browserContext = await browser.newContext();
      logger.info('Browser context initialized for Gesdep');
    }
  }

  async login(credentials: LoginCredentials): Promise<Page> {
    await this.init();
    const page = await this.browserContext!.newPage();
    try {
      await page.goto('https://gesdep.net/login');
      await page.fill(selectors.login.username, credentials.username);
      await page.fill(selectors.login.password, credentials.password);
      await page.click(selectors.login.submit);
      await page.waitForURL('**/dashboard');
      return page;
    } catch (err) {
      logger.error({ err }, 'Gesdep login failed');
      throw new ExternalServiceError('Failed to login to Gesdep');
    }
  }

  async fetchHtml(url: string): Promise<string> {
    await this.init();
    const page = await this.browserContext!.newPage();
    try {
      await page.goto(url);
      return page.content();
    } catch (err) {
      logger.error({ err, url }, 'Fetching page failed');
      throw new ExternalServiceError('Failed to fetch Gesdep page');
    }
  }
}
