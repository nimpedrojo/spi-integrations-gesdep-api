import { FastifyInstance } from 'fastify';
import { GesdepClient } from '../../gesdep/actions/gesdepClient.js';
import { GetTeamMatchStatsUseCase } from '../../application/getTeamMatchStatsUseCase.js';
import { TeamMatchesReadService } from '../../application/teamMatchesReadService.js';
import { MatchCompetition, MatchResultFilter, TeamMatchesResponse } from '../../domain/types.js';

export interface RegisterTeamMatchesRouteDeps {
  readService?: TeamMatchesReadService;
}

const competitionEnum = ['all', 'league', 'cup', 'friendly', 'tournament'] as const;
const resultEnum = ['all', 'won', 'drawn', 'lost'] as const;

export const registerTeamMatchesRoute = (app: FastifyInstance, deps: RegisterTeamMatchesRouteDeps = {}) => {
  const readService = deps.readService ?? new TeamMatchesReadService({
    onlineUseCase: new GetTeamMatchStatsUseCase({ navigator: new GesdepClient() })
  });

  app.get<{
    Params: { teamId: string };
    Querystring: { competition?: MatchCompetition; result?: MatchResultFilter };
    Reply: TeamMatchesResponse;
  }>('/teams/:teamId/matches', {
    preHandler: async (request, reply) => app.authenticate(request, reply),
    schema: {
      tags: ['teams', 'stats'],
      summary: 'Listado de partidos disputados por equipo',
      description:
        'Devuelve los partidos jugados en la temporada actual para un equipo con filtros opcionales por competicion y resultado. ' +
        'Lee desde MySQL si el batch diario ya materializo el listado; en otro caso hace consulta online a Gesdep.',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['teamId'],
        properties: {
          teamId: { type: 'string', description: 'Identificador del equipo en Gesdep' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          competition: { type: 'string', enum: competitionEnum, default: 'all' },
          result: { type: 'string', enum: resultEnum, default: 'all' }
        }
      },
      response: {
        200: {
          type: 'object',
          required: ['item', 'meta'],
          properties: {
            item: {
              type: 'object',
              required: ['teamId', 'teamName', 'filters', 'matches'],
              properties: {
                teamId: { type: 'string' },
                teamName: { type: ['string', 'null'] },
                filters: {
                  type: 'object',
                  required: ['competition', 'result'],
                  properties: {
                    competition: { type: 'string', enum: competitionEnum },
                    result: { type: 'string', enum: resultEnum }
                  }
                },
                matches: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: [
                      'matchId',
                      'teamId',
                      'teamName',
                      'opponentName',
                      'isHome',
                      'teamScore',
                      'opponentScore',
                      'result',
                      'competition',
                      'kickoffAt',
                      'venue'
                    ],
                    properties: {
                      matchId: { type: 'string' },
                      teamId: { type: 'string' },
                      teamName: { type: 'string' },
                      opponentName: { type: 'string' },
                      isHome: { type: 'boolean' },
                      teamScore: { type: 'integer', minimum: 0 },
                      opponentScore: { type: 'integer', minimum: 0 },
                      result: { type: 'string', enum: ['won', 'drawn', 'lost'] },
                      competition: { type: 'string', enum: ['league', 'cup', 'friendly', 'tournament'] },
                      kickoffAt: { type: 'string' },
                      venue: { type: ['string', 'null'] }
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
        401: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    } as any
  }, async (request, reply) => {
    const { teamId } = request.params;
    const competition = request.query.competition ?? 'all';
    const result = request.query.result ?? 'all';
    const payload = await readService.list(teamId, competition, result);
    reply.send(payload);
  });
};
