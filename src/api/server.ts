import Fastify from 'fastify';
import cors from '@fastify/cors';
import { logger } from '../shared/logger.js';
import { config } from '../shared/config.js';
import { registerHealthRoute } from './routes/health.js';
import { AppError } from '../shared/errors.js';
import { registerTeamsRoute, RegisterTeamsRouteDeps } from './routes/teams.js';
import { registerPlayersRoute } from './routes/players.js';

export interface BuildServerDeps {
  teamsRoute?: RegisterTeamsRouteDeps;
}

export const buildServer = (deps: BuildServerDeps = {}) => {
  const app = Fastify({ logger: logger as any });

  app.register(cors, { origin: true });
  registerHealthRoute(app);
  registerTeamsRoute(app, deps.teamsRoute);
  registerPlayersRoute(app);

  app.setErrorHandler((err, _req, reply) => {
    const status = err instanceof AppError ? err.statusCode : 500;
    app.log.error({ err }, 'Request failed');
    reply.status(status).send({ error: err.message });
  });

  return app;
};

if (process.env.NODE_ENV !== 'test') {
  const app = buildServer();
  app.listen({ port: config.PORT, host: '0.0.0.0' })
    .then(() => logger.info(`Server listening on ${config.PORT}`))
    .catch((err) => {
      logger.error(err, 'Failed to start server');
      process.exit(1);
    });
}
