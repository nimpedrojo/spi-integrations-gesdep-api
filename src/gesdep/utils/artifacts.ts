import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { Page } from 'playwright';
import { logger } from '../../shared/logger.js';

const SCREENSHOT_DIR = 'artifacts/screenshots';
const HTML_DIR = 'artifacts/html';

const ensureDir = async (dir: string) => mkdir(dir, { recursive: true });

const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

export const saveScreenshot = async (page: Page, label: string) => {
  const dir = SCREENSHOT_DIR;
  await ensureDir(dir);
  const filename = join(dir, `${timestamp()}-${label}.png`);
  await page.screenshot({ path: filename, fullPage: true });
  logger.info({ screenshot: filename }, 'Saved screenshot');
  return filename;
};

export const saveHtml = async (page: Page, label: string) => {
  const dir = HTML_DIR;
  await ensureDir(dir);
  const filename = join(dir, `${timestamp()}-${label}.html`);
  const content = await page.content();
  await writeFile(filename, content, 'utf8');
  logger.info({ html: filename }, 'Saved page HTML');
  return filename;
};
