import { config } from '../shared/config.js';
import { logger } from '../shared/logger.js';
import { SessionManager } from '../application/sessionManager.js';
import { performLogin } from '../gesdep/actions/login.js';
import { ExternalServiceError } from '../shared/errors.js';
const run = async () => {
    const sessionManager = new SessionManager();
    try {
        logger.info({ baseUrl: config.GESDEP_BASE_URL, headless: config.GESDEP_HEADLESS }, 'Starting Gesdep login probe');
        const result = await performLogin(sessionManager);
        logger.info({
            success: result.success,
            url: result.url,
            screenshot: result.screenshot,
            html: result.html
        }, 'Probe finished');
        process.exitCode = 0;
    }
    catch (err) {
        const error = err;
        const context = error instanceof ExternalServiceError ? error.context : undefined;
        logger.error({ err: error, context }, 'Probe failed');
        process.exitCode = 1;
    }
    finally {
        await sessionManager.dispose();
    }
};
run();
