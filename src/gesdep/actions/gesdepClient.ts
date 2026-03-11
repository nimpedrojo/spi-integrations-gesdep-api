import { BrowserContext, Page } from 'playwright';
import { createBrowser } from '../browser/browserFactory.js';
import { selectors } from '../selectors/index.js';
import { ExternalServiceError } from '../../shared/errors.js';
import { logger } from '../../shared/logger.js';
import { config } from '../../shared/config.js';

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

  private async openAuthenticatedPage(): Promise<Page> {
    return this.login({
      username: config.GESDEP_USERNAME,
      password: config.GESDEP_PASSWORD
    });
  }

  async login(credentials: LoginCredentials): Promise<Page> {
    await this.init();
    const page = await this.browserContext!.newPage();
    try {
      await page.goto(new URL(selectors.login.path, config.GESDEP_BASE_URL).toString(), {
        waitUntil: 'domcontentloaded'
      });
      await page.fill(selectors.login.username, credentials.username);
      await page.fill(selectors.login.password, credentials.password);
      await page.click(selectors.login.submit);
      await page.waitForSelector(selectors.login.success, {
        state: 'attached'
      });
      return page;
    } catch (err) {
      await page.close();
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

  async openTeamsPage(): Promise<Page> {
    const page = await this.openAuthenticatedPage();

    try {
      await page.goto(new URL(selectors.teams.path, config.GESDEP_BASE_URL).toString(), {
        waitUntil: 'domcontentloaded'
      });
      await page.waitForSelector(selectors.teams.ready, {
        state: 'attached'
      });
      return page;
    } catch (err) {
      await page.close();
      logger.error({ err }, 'Opening teams page failed');
      throw new ExternalServiceError('Failed to open Gesdep teams page');
    }
  }

  async fetchTeamsHtml(): Promise<string> {
    const page = await this.openTeamsPage();

    try {
      return await page.content();
    } catch (err) {
      logger.error({ err }, 'Reading teams page HTML failed');
      throw new ExternalServiceError('Failed to read Gesdep teams HTML');
    } finally {
      await page.close();
    }
  }

  async fetchTeamHtml(teamId: string): Promise<string> {
    const page = await this.openAuthenticatedPage();

    try {
      await page.goto(new URL(`${selectors.teams.path}?idequ=${encodeURIComponent(teamId)}`, config.GESDEP_BASE_URL).toString(), {
        waitUntil: 'domcontentloaded'
      });
      await page.waitForSelector(selectors.teams.detailPlayers, {
        state: 'attached'
      });
      return await page.content();
    } catch (err) {
      logger.error({ err, teamId }, 'Reading team detail HTML failed');
      throw new ExternalServiceError('Failed to read Gesdep team detail HTML');
    } finally {
      await page.close();
    }
  }

  async fetchPlayerHtml(playerId: string): Promise<string> {
    const page = await this.openAuthenticatedPage();

    try {
      await page.goto(new URL(`${selectors.players.path}?idjug=${encodeURIComponent(playerId)}`, config.GESDEP_BASE_URL).toString(), {
        waitUntil: 'domcontentloaded'
      });
      await page.waitForSelector(selectors.players.ready, {
        state: 'attached'
      });
      return await page.content();
    } catch (err) {
      logger.error({ err, playerId }, 'Reading player detail HTML failed');
      throw new ExternalServiceError('Failed to read Gesdep player detail HTML');
    } finally {
      await page.close();
    }
  }

  async fetchTeamHtmlBatch(teamIds: string[]): Promise<Record<string, string>> {
    if (teamIds.length === 0) {
      return {};
    }

    const authPage = await this.openAuthenticatedPage();
    const results: Record<string, string> = {};
    const pendingTeamIds = [...teamIds];

    const worker = async () => {
      while (pendingTeamIds.length > 0) {
        const teamId = pendingTeamIds.shift();

        if (!teamId) {
          return;
        }

        const page = await this.browserContext!.newPage();

        try {
          await page.goto(new URL(`${selectors.teams.path}?idequ=${encodeURIComponent(teamId)}`, config.GESDEP_BASE_URL).toString(), {
            waitUntil: 'domcontentloaded'
          });
          await page.waitForSelector(selectors.teams.detailPlayers, {
            state: 'attached'
          });
          results[teamId] = await page.content();
        } catch (err) {
          logger.error({ err, teamId }, 'Reading team detail HTML failed in batch mode');
          throw new ExternalServiceError('Failed to read Gesdep team detail HTML');
        } finally {
          await page.close();
        }
      }
    };

    try {
      await Promise.all(
        Array.from({ length: Math.min(config.GESDEP_DETAIL_CONCURRENCY, teamIds.length) }, async () => worker())
      );
      return results;
    } finally {
      await authPage.close();
    }
  }
}
