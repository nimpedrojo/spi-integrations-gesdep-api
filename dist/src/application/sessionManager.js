process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '.pw-browsers';
import { config } from '../shared/config.js';
import { logger } from '../shared/logger.js';
let playwright = null;
const loadPlaywright = async () => {
    if (!playwright) {
        playwright = await import('playwright');
    }
    return playwright;
};
/**
 * Session manager for Gesdep automation.
 * - Lazily creates a single browser/context.
 * - Headless mode is env-driven (GESDEP_HEADLESS).
 * - Call dispose() to close cleanly.
 */
export class SessionManager {
    async init() {
        if (this.context)
            return this.context;
        const { chromium } = await loadPlaywright();
        logger.info({
            headless: config.GESDEP_HEADLESS,
            browsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH,
            executablePath: config.GESDEP_CHROMIUM_PATH
        }, 'Launching Playwright browser');
        this.browser = await chromium.launch({
            headless: config.GESDEP_HEADLESS,
            executablePath: config.GESDEP_CHROMIUM_PATH
        });
        this.context = await this.browser.newContext({
            baseURL: config.GESDEP_BASE_URL
        });
        return this.context;
    }
    async newPage() {
        const ctx = await this.init();
        return ctx.newPage();
    }
    async dispose() {
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
