import { FastifyInstance } from 'fastify';
import { GesdepClient } from '../../gesdep/actions/gesdepClient.js';
import { ListTeamsUseCase } from '../../application/listTeamsUseCase.js';
import { ListTeamsExtendedResponse, ListTeamsResponse } from '../../domain/types.js';
import { TeamReadService } from '../../application/teamReadService.js';

export interface RegisterTeamsRouteDeps {
  readService?: TeamReadService;
}

export const registerTeamsRoute = (app: FastifyInstance, deps: RegisterTeamsRouteDeps = {}) => {
  const readService = deps.readService ?? new TeamReadService({
    onlineUseCase: new ListTeamsUseCase({ navigator: new GesdepClient() })
  });

  app.get<{
    Reply: ListTeamsResponse;
  }>('/teams', {
    schema: {
      response: {
        200: {
          type: 'object',
          required: ['items', 'meta'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'name', 'category', 'season', 'status'],
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  category: { type: ['string', 'null'] },
                  season: { type: ['string', 'null'] },
                  status: { type: ['string', 'null'] }
                }
              }
            },
            meta: {
              type: 'object',
              required: ['source', 'count'],
              properties: {
                source: { type: 'string', enum: ['gesdep', 'mysql'] },
                count: { type: 'integer', minimum: 0 }
              }
            }
          }
        }
      }
    }
  }, async (_request, reply) => {
    const payload = await readService.listBasic();
    reply.send(payload);
  });

  app.get<{
    Reply: ListTeamsExtendedResponse;
  }>('/teams/extended', {
    schema: {
      response: {
        200: {
          type: 'object',
          required: ['items', 'meta'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'name', 'category', 'season', 'status', 'players'],
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  category: { type: ['string', 'null'] },
                  season: { type: ['string', 'null'] },
                  status: { type: ['string', 'null'] },
                  players: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['id', 'shortName', 'fullName'],
                      properties: {
                        id: { type: 'string' },
                        shortName: { type: 'string' },
                        fullName: { type: 'string' }
                      }
                    }
                  }
                }
              }
            },
            meta: {
              type: 'object',
              required: ['source', 'count'],
              properties: {
                source: { type: 'string', enum: ['gesdep', 'mysql'] },
                count: { type: 'integer', minimum: 0 }
              }
            }
          }
        }
      }
    }
  }, async (_request, reply) => {
    const payload = await readService.listExtended();
    reply.send(payload);
  });
};
