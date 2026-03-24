import { describe, expect, it, vi } from 'vitest';
import { TeamMatchesReadService } from '../src/application/teamMatchesReadService.js';

describe('TeamMatchesReadService', () => {
  it('returns mysql payload when available', async () => {
    const service = new TeamMatchesReadService({
      repository: {
        list: vi.fn().mockResolvedValue({
          item: {
            teamId: '636',
            teamName: 'JUVENIL PREFERENTE',
            filters: { competition: 'all', result: 'all' },
            matches: []
          },
          meta: { source: 'mysql' as const }
        })
      } as any
    });

    await expect(service.list('636')).resolves.toMatchObject({ meta: { source: 'mysql' } });
  });

  it('falls back to gesdep when mysql is empty', async () => {
    const executeMatches = vi.fn().mockResolvedValue({
      item: {
        teamId: '636',
        teamName: 'JUVENIL PREFERENTE',
        filters: { competition: 'league', result: 'won' },
        matches: []
      },
      meta: { source: 'gesdep' as const }
    });
    const service = new TeamMatchesReadService({
      repository: {
        list: vi.fn().mockResolvedValue(null),
        findTeamName: vi.fn().mockResolvedValue('JUVENIL PREFERENTE')
      } as any,
      onlineUseCase: {
        executeMatches
      } as any
    });

    await expect(service.list('636', 'league', 'won')).resolves.toMatchObject({ meta: { source: 'gesdep' } });
    expect(executeMatches).toHaveBeenCalledWith('636', 'league', 'won', 'JUVENIL PREFERENTE');
  });
});
