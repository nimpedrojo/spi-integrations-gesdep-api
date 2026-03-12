import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { logger } from '../shared/logger.js';
import { config } from '../shared/config.js';
import { registerHealthRoute } from './routes/health.js';
import { registerAuthRoute } from './routes/auth.js';
import { AppError } from '../shared/errors.js';
import { registerTeamsRoute, RegisterTeamsRouteDeps } from './routes/teams.js';
import { registerPlayersRoute, RegisterPlayersRouteDeps } from './routes/players.js';
import { registerTeamWorkStatsRoute, RegisterTeamWorkStatsRouteDeps } from './routes/teamWorkStats.js';
import { registerTeamMatchStatsRoute, RegisterTeamMatchStatsRouteDeps } from './routes/teamMatchStats.js';
import { ensureDatabaseSchema } from '../db/schema.js';
import { authPlugin } from './auth.js';

export interface BuildServerDeps {
  teamsRoute?: RegisterTeamsRouteDeps;
  playersRoute?: RegisterPlayersRouteDeps;
  teamWorkStatsRoute?: RegisterTeamWorkStatsRouteDeps;
  teamMatchStatsRoute?: RegisterTeamMatchStatsRouteDeps;
}

export const buildServer = (deps: BuildServerDeps = {}) => {
  const app = Fastify({ logger: logger as any });

  app.register(cors, { origin: true });
  app.register(authPlugin);
  app.register(swagger, {
    openapi: {
      info: {
        title: 'Gesdep Middleware API',
        description:
          'REST API sobre Gesdep.net con cache en memoria, lectura desde MySQL y fallback online a Gesdep cuando aplica. ' +
          'Los endpoints protegidos requieren un Bearer token obtenido en /auth/token.',
        version: '0.1.0'
      },
      servers: [
        {
          url: `http://localhost:${config.PORT}`,
          description: 'Local'
        }
      ],
      tags: [
        { name: 'auth', description: 'Autenticacion de la API' },
        { name: 'health', description: 'Estado del servicio' },
        { name: 'teams', description: 'Equipos y roster' },
        { name: 'players', description: 'Detalle de jugadores' },
        { name: 'stats', description: 'Estadisticas de trabajo por equipo' }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    }
  });
  app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      persistAuthorization: true
    },
    transformSpecificationClone: true,
    transformSpecification: (swaggerObject: any, request: any) => {
      const protocol = request.headers['x-forwarded-proto']?.toString() ?? request.protocol;
      const host = request.headers['x-forwarded-host']?.toString() ?? request.headers.host;

      return {
        ...swaggerObject,
        servers: host
          ? [
              {
                url: `${protocol}://${host}`,
                description: 'Current environment'
              }
            ]
          : swaggerObject.servers
      };
    }
  });

  app.after(() => {
    registerAuthRoute(app);
    registerHealthRoute(app);
    registerTeamsRoute(app, deps.teamsRoute);
    registerPlayersRoute(app, deps.playersRoute);
    registerTeamWorkStatsRoute(app, deps.teamWorkStatsRoute);
    registerTeamMatchStatsRoute(app, deps.teamMatchStatsRoute);
  });

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
