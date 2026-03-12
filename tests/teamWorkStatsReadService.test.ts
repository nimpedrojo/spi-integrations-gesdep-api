import { describe, expect, it, vi } from 'vitest';
import { TeamWorkStatsReadService } from '../src/application/teamWorkStatsReadService.js';

describe('TeamWorkStatsReadService', () => {
  it('returns mysql data when the full range is covered', async () => {
    const service = new TeamWorkStatsReadService({
      repository: {
        hasFullCoverage: vi.fn().mockResolvedValue(true),
        getAggregated: vi.fn().mockResolvedValue({
          item: {
            teamId: '636',
            teamName: 'Juvenil Preferente',
            from: '2026-03-01',
            to: '2026-03-02',
            methods: [{ method: 'Rondos', minutes: 30 }],
            topExercises: []
          },
          meta: { source: 'mysql' as const }
        })
      } as any,
      onlineUseCase: {
        execute: vi.fn()
      } as any
    });

    await expect(service.get('636', '2026-03-01', '2026-03-02')).resolves.toMatchObject({
      meta: { source: 'mysql' }
    });
  });

  it('falls back to gesdep when mysql coverage is incomplete', async () => {
    const execute = vi.fn().mockResolvedValue({
      item: {
        teamId: '636',
        teamName: 'Juvenil Preferente',
        from: '2026-03-01',
        to: '2026-03-05',
        methods: [{ method: 'Rondos', minutes: 45 }],
        topExercises: []
      },
      meta: { source: 'gesdep' as const }
    });

    const service = new TeamWorkStatsReadService({
      repository: {
        hasFullCoverage: vi.fn().mockResolvedValue(false),
        getAggregated: vi.fn()
      } as any,
      onlineUseCase: {
        execute
      } as any
    });

    await expect(service.get('636', '2026-03-01', '2026-03-05')).resolves.toMatchObject({
      meta: { source: 'gesdep' }
    });
    expect(execute).toHaveBeenCalledWith('636', '2026-03-01', '2026-03-05');
  });
});
