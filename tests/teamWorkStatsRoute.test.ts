import { describe, expect, it } from 'vitest';
import { buildServer } from '../src/api/server.js';

describe('team work stats route', () => {
  it('returns team work stats for authenticated users', async () => {
    const app = buildServer({
      teamWorkStatsRoute: {
        readService: {
          async get(teamId: string, from: string, to: string) {
            return {
              item: {
                teamId,
                teamName: 'Juvenil Preferente',
                from,
                to,
                methods: [{ method: 'Rondos', minutes: 45 }],
                topExercises: [{ rank: 1, exerciseId: 'EX-1', title: 'Rondo por equipos 1', minutes: 20, imageUrl: null }]
              },
              meta: {
                source: 'mysql' as const
              }
            };
          }
        } as any
      }
    });

    const authResponse = await app.inject({
      method: 'POST',
      url: '/auth/token',
      payload: {
        username: 'admin',
        password: 'admin'
      }
    });

    const { accessToken } = authResponse.json();

    const response = await app.inject({
      method: 'GET',
      url: '/teams/636/work-stats?from=2026-03-01&to=2026-03-07',
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      item: {
        teamId: '636',
        from: '2026-03-01',
        to: '2026-03-07'
      },
      meta: {
        source: 'mysql'
      }
    });
  });
});
