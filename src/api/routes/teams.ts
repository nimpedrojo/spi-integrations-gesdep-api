import { FastifyInstance } from 'fastify';
import { GesdepClient } from '../../gesdep/actions/gesdepClient.js';
import { ListTeamsUseCase } from '../../application/listTeamsUseCase.js';
import { ListTeamsExtendedResponse, ListTeamsResponse } from '../../domain/types.js';

export interface RegisterTeamsRouteDeps {
  useCase?: ListTeamsUseCase;
}

export const registerTeamsRoute = (app: FastifyInstance, deps: RegisterTeamsRouteDeps = {}) => {
  const useCase = deps.useCase ?? new ListTeamsUseCase({ navigator: new GesdepClient() });

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
                source: { type: 'string', const: 'gesdep' },
                count: { type: 'integer', minimum: 0 }
              }
            }
          }
        }
      }
    }
  }, async (_request, reply) => {
    const payload = await useCase.execute();
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
                source: { type: 'string', const: 'gesdep' },
                count: { type: 'integer', minimum: 0 }
              }
            }
          }
        }
      }
    }
  }, async (_request, reply) => {
    const payload = await useCase.executeExtended();
    reply.send(payload);
  });
};
