import { describe, expect, it } from 'vitest';
import { buildServer } from '../src/api/server.js';

describe('team matches route', () => {
  it('returns team matches for authenticated users', async () => {
    const app = buildServer({
      teamMatchesRoute: {
        readService: {
          async list(teamId: string, competition: string, result: string) {
            return {
              item: {
                teamId,
                teamName: 'JUVENIL PREFERENTE',
                filters: { competition, result },
                matches: [
                  {
                    matchId: 'M1',
                    teamId,
                    teamName: 'JUVENIL PREFERENTE',
                    opponentName: 'Rival A',
                    isHome: true,
                    teamScore: 2,
                    opponentScore: 1,
                    result: 'won',
                    competition: 'league',
                    kickoffAt: '01/03/2026 - 16:30',
                    venue: 'Stadium'
                  }
                ]
              },
              meta: { source: 'mysql' as const }
            };
          }
        } as any
      }
    });

    const authResponse = await app.inject({
      method: 'POST',
      url: '/auth/token',
      payload: { username: 'admin', password: 'admin' }
    });
    const { accessToken } = authResponse.json();

    const response = await app.inject({
      method: 'GET',
      url: '/teams/636/matches?competition=league&result=won',
      headers: { authorization: `Bearer ${accessToken}` }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      item: {
        teamId: '636',
        filters: { competition: 'league', result: 'won' },
        matches: [{ opponentName: 'Rival A', venue: 'Stadium' }]
      },
      meta: { source: 'mysql' }
    });
  });
});
