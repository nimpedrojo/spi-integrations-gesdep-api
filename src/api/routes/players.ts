import { FastifyInstance } from 'fastify';
import { GesdepClient } from '../../gesdep/actions/gesdepClient.js';
import { GetPlayerUseCase } from '../../application/getPlayerUseCase.js';
import { GetPlayerResponse } from '../../domain/types.js';

export interface RegisterPlayersRouteDeps {
  useCase?: GetPlayerUseCase;
}

export const registerPlayersRoute = (app: FastifyInstance, deps: RegisterPlayersRouteDeps = {}) => {
  const useCase = deps.useCase ?? new GetPlayerUseCase({ navigator: new GesdepClient() });

  app.get<{
    Params: { id: string };
    Reply: GetPlayerResponse;
  }>('/players/:id', {
    schema: {
      response: {
        200: {
          type: 'object',
          required: ['item', 'meta'],
          properties: {
            item: {
              type: 'object',
              required: ['id', 'shortName', 'fullName', 'fields'],
              properties: {
                id: { type: 'string' },
                shortName: { type: ['string', 'null'] },
                fullName: { type: ['string', 'null'] },
                fields: {
                  type: 'object',
                  additionalProperties: {
                    type: ['string', 'null']
                  }
                }
              }
            },
            meta: {
              type: 'object',
              required: ['source'],
              properties: {
                source: { type: 'string', const: 'gesdep' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const payload = await useCase.execute(request.params.id);
    reply.send(payload);
  });
};
