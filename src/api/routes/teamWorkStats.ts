import { FastifyInstance } from 'fastify';
import { GetTeamWorkStatsUseCase } from '../../application/getTeamWorkStatsUseCase.js';
import { TeamWorkStatsReadService } from '../../application/teamWorkStatsReadService.js';
import { GesdepClient } from '../../gesdep/actions/gesdepClient.js';
import { TeamWorkStatsResponse } from '../../domain/types.js';

export interface RegisterTeamWorkStatsRouteDeps {
  readService?: TeamWorkStatsReadService;
}

const datePattern = '^\\d{4}-\\d{2}-\\d{2}$';

export const registerTeamWorkStatsRoute = (app: FastifyInstance, deps: RegisterTeamWorkStatsRouteDeps = {}) => {
  const readService = deps.readService ?? new TeamWorkStatsReadService({
    onlineUseCase: new GetTeamWorkStatsUseCase({ navigator: new GesdepClient() })
  });

  app.get<{
    Params: { teamId: string };
    Querystring: { from: string; to: string };
    Reply: TeamWorkStatsResponse;
  }>('/teams/:teamId/work-stats', {
    preHandler: async (request, reply) => app.authenticate(request, reply),
    schema: {
      tags: ['teams', 'stats'],
      summary: 'Estadisticas de trabajo realizado por equipo y fechas',
      description:
        'Devuelve las estadisticas de trabajos realizados para un equipo entre dos fechas. ' +
        'Si el rango ya esta cubierto por el snapshot diario almacenado en MySQL responde desde BD; ' +
        'si falta cobertura diaria hace consulta online a Gesdep.',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['teamId'],
        properties: {
          teamId: {
            type: 'string',
            description: 'Identificador del equipo en Gesdep'
          }
        }
      },
      querystring: {
        type: 'object',
        required: ['from', 'to'],
        properties: {
          from: {
            type: 'string',
            pattern: datePattern,
            description: 'Fecha inicial inclusive en formato YYYY-MM-DD'
          },
          to: {
            type: 'string',
            pattern: datePattern,
            description: 'Fecha final inclusive en formato YYYY-MM-DD'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          required: ['item', 'meta'],
          properties: {
            item: {
              type: 'object',
              required: ['teamId', 'teamName', 'from', 'to', 'methods', 'topExercises'],
              properties: {
                teamId: { type: 'string' },
                teamName: { type: ['string', 'null'] },
                from: { type: 'string' },
                to: { type: 'string' },
                methods: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['method', 'minutes'],
                    properties: {
                      method: { type: 'string' },
                      minutes: { type: 'integer', minimum: 0 }
                    }
                  }
                },
                topExercises: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['rank', 'exerciseId', 'title', 'minutes', 'imageUrl'],
                    properties: {
                      rank: { type: 'integer', minimum: 1 },
                      exerciseId: { type: ['string', 'null'] },
                      title: { type: 'string' },
                      minutes: { type: 'integer', minimum: 0 },
                      imageUrl: { type: ['string', 'null'] }
                    }
                  }
                }
              }
            },
            meta: {
              type: 'object',
              required: ['source'],
              properties: {
                source: { type: 'string', enum: ['gesdep', 'mysql'] }
              }
            }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          },
          example: {
            error: '`from` must be less than or equal to `to`'
          }
        },
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      },
      examples: [
        {
          summary: 'Rango semanal',
          value: {
            teamId: '636',
            from: '2026-03-01',
            to: '2026-03-07'
          }
        }
      ]
    } as any
  }, async (request, reply) => {
    const { teamId } = request.params;
    const { from, to } = request.query;

    if (from > to) {
      reply.status(400).send({ error: '`from` must be less than or equal to `to`' } as any);
      return;
    }

    const payload = await readService.get(teamId, from, to);
    reply.send(payload);
  });
};
