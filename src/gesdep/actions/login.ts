import { Page } from 'playwright';
import { config } from '../../shared/config.js';
import { logger } from '../../shared/logger.js';
import { saveHtml, saveScreenshot } from '../utils/artifacts.js';
import { AppError, ExternalServiceError } from '../../shared/errors.js';
import { SessionManager } from '../../application/sessionManager.js';

const LOGIN_URL_PLACEHOLDER = 'v3/login.aspx'; // TODO: adjust to the real login path if different.

// TODO: Replace selectors with real Gesdep ones before running against production.
export const SELECTORS = {
  username: '#txtNombre',
  password: '#txtContra',
  submit: '#btnEntrar',
  success: '#ctl00_lblUsuario' // TODO: verify against the authenticated landing page.
} as const;

const ACTION_TIMEOUT_MS = 15_000;

const assertSelectorConfigured = (selector: string, name: string) => {
  if (!selector || selector.startsWith('INPUT_') || selector.startsWith('POST_') || selector.includes('PLACEHOLDER')) {
    throw new AppError(`Selector placeholder not configured: ${name}`);
  }
};

const validateSelectors = () => {
  assertSelectorConfigured(SELECTORS.username, 'username');
  assertSelectorConfigured(SELECTORS.password, 'password');
  assertSelectorConfigured(SELECTORS.submit, 'submit');
  assertSelectorConfigured(SELECTORS.success, 'success');
};

export interface LoginResult {
  success: boolean;
  url: string;
  screenshot: string;
  html: string;
}

export const performLogin = async (sessionManager: SessionManager): Promise<LoginResult> => {
  validateSelectors();

  const page = await sessionManager.newPage();
  const loginUrl = new URL(LOGIN_URL_PLACEHOLDER, config.GESDEP_BASE_URL).toString();

  try {
    logger.info({ loginUrl }, 'Opening login page');
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: ACTION_TIMEOUT_MS });

    logger.info('Filling credentials');
    await page.fill(SELECTORS.username, config.GESDEP_USERNAME, { timeout: ACTION_TIMEOUT_MS });
    await page.fill(SELECTORS.password, config.GESDEP_PASSWORD, { timeout: ACTION_TIMEOUT_MS });
    await page.click(SELECTORS.submit, { timeout: ACTION_TIMEOUT_MS });

    logger.info('Waiting for login success indicator');
    await page.waitForSelector(SELECTORS.success, { timeout: ACTION_TIMEOUT_MS, state: 'visible' });

    const screenshot = await saveScreenshot(page, 'login-success');
    const html = await saveHtml(page, 'login-success');
    const url = page.url();

    logger.info({ url }, 'Login probe succeeded');
    return { success: true, url, screenshot, html };
  } catch (err) {
    logger.error({ err }, 'Login probe failed');
    const screenshot = await saveScreenshot(page, 'login-failed');
    const html = await saveHtml(page, 'login-failed');
    throw new ExternalServiceError('Login failed; adjust selectors or credentials', {
      url: page.url(),
      screenshot,
      html,
      cause: (err as Error).message
    });
  } finally {
    await page.close();
  }
};
