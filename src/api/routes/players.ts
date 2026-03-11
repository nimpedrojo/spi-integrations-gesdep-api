import { FastifyInstance } from 'fastify';
import { GesdepClient } from '../../gesdep/actions/gesdepClient.js';
import { GetPlayerUseCase } from '../../application/getPlayerUseCase.js';
import { GetPlayerResponse } from '../../domain/types.js';
import { PlayerReadService } from '../../application/playerReadService.js';

export interface RegisterPlayersRouteDeps {
  readService?: PlayerReadService;
}

export const registerPlayersRoute = (app: FastifyInstance, deps: RegisterPlayersRouteDeps = {}) => {
  const readService = deps.readService ?? new PlayerReadService({
    onlineUseCase: new GetPlayerUseCase({ navigator: new GesdepClient() })
  });

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
                source: { type: 'string', enum: ['gesdep', 'mysql'] }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const payload = await readService.getById(request.params.id);
    reply.send(payload);
  });
};
