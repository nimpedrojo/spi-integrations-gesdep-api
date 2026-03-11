import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { logger } from '../shared/logger.js';
import { config } from '../shared/config.js';
import { registerHealthRoute } from './routes/health.js';
import { AppError } from '../shared/errors.js';
import { registerTeamsRoute, RegisterTeamsRouteDeps } from './routes/teams.js';
import { registerPlayersRoute, RegisterPlayersRouteDeps } from './routes/players.js';
import { ensureDatabaseSchema } from '../db/schema.js';

export interface BuildServerDeps {
  teamsRoute?: RegisterTeamsRouteDeps;
  playersRoute?: RegisterPlayersRouteDeps;
}

export const buildServer = (deps: BuildServerDeps = {}) => {
  const app = Fastify({ logger: logger as any });

  app.register(cors, { origin: true });
  app.register(swagger, {
    openapi: {
      info: {
        title: 'Gesdep Middleware API',
        description: 'REST API sobre Gesdep.net con cache y lectura desde MySQL.',
        version: '0.1.0'
      },
      servers: [
        {
          url: `http://localhost:${config.PORT}`,
          description: 'Local'
        }
      ],
      tags: [
        { name: 'health', description: 'Estado del servicio' },
        { name: 'teams', description: 'Equipos y roster' },
        { name: 'players', description: 'Detalle de jugadores' }
      ]
    }
  });
  app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    }
  });
  registerHealthRoute(app);
  registerTeamsRoute(app, deps.teamsRoute);
  registerPlayersRoute(app, deps.playersRoute);

  app.setErrorHandler((err, _req, reply) => {
    const status = err instanceof AppError ? err.statusCode : 500;
    app.log.error({ err }, 'Request failed');
    reply.status(status).send({ error: err.message });
  });

  return app;
};

if (process.env.NODE_ENV !== 'test') {
  ensureDatabaseSchema()
    .then(() => {
      const app = buildServer();
      return app.listen({ port: config.PORT, host: '0.0.0.0' });
    })
    .then(() => logger.info(`Server listening on ${config.PORT}`))
    .catch((err) => {
      logger.error(err, 'Failed to start server');
      process.exit(1);
    });
}
