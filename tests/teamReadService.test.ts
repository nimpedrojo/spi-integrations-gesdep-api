import { describe, expect, it, vi } from 'vitest';
import { TeamReadService } from '../src/application/teamReadService.js';
import { MemoryCache } from '../src/shared/memoryCache.js';

describe('TeamReadService', () => {
  it('returns MySQL data when repository has records', async () => {
    const repository = {
      listBasic: vi.fn().mockResolvedValue([
        {
          id: 'TEAM-1',
          name: 'Cadete A',
          category: 'Cadete',
          season: '2025-26',
          status: 'active'
        }
      ]),
      listExtended: vi.fn()
    };

    const onlineUseCase = {
      execute: vi.fn(),
      executeExtended: vi.fn()
    };

    const service = new TeamReadService({
      repository: repository as any,
      onlineUseCase: onlineUseCase as any,
      cache: new MemoryCache()
    });

    await expect(service.listBasic()).resolves.toEqual({
      items: [
        {
          id: 'TEAM-1',
          name: 'Cadete A',
          category: 'Cadete',
          season: '2025-26',
          status: 'active'
        }
      ],
      meta: {
        source: 'mysql',
        count: 1
      }
    });

    expect(onlineUseCase.execute).not.toHaveBeenCalled();
  });

  it('falls back to online use case when repository is empty', async () => {
    const repository = {
      listBasic: vi.fn().mockResolvedValue([]),
      listExtended: vi.fn().mockResolvedValue([])
    };

    const onlineUseCase = {
      execute: vi.fn().mockResolvedValue({
        items: [
          {
            id: 'TEAM-2',
            name: 'Infantil B',
            category: null,
            season: '2025-26',
            status: 'active'
          }
        ],
        meta: {
          source: 'gesdep',
          count: 1
        }
      }),
      executeExtended: vi.fn()
    };

    const service = new TeamReadService({
      repository: repository as any,
      onlineUseCase: onlineUseCase as any,
      cache: new MemoryCache()
    });

    await expect(service.listBasic()).resolves.toEqual({
      items: [
        {
          id: 'TEAM-2',
          name: 'Infantil B',
          category: null,
          season: '2025-26',
          status: 'active'
        }
      ],
      meta: {
        source: 'gesdep',
        count: 1
      }
    });
  });

  it('falls back to online extended use case when mysql teams have no roster rows', async () => {
    const repository = {
      listBasic: vi.fn(),
      listExtended: vi.fn().mockResolvedValue([
        {
          id: 'TEAM-1',
          name: 'Cadete A',
          category: 'Cadete',
          season: '2025-26',
          status: 'active',
          players: []
        }
      ])
    };

    const onlineUseCase = {
      execute: vi.fn(),
      executeExtended: vi.fn().mockResolvedValue({
        items: [
          {
            id: 'TEAM-1',
            name: 'Cadete A',
            category: 'Cadete',
            season: '2025-26',
            status: 'active',
            players: [
              {
                id: 'PLAYER-1',
                shortName: 'Mario',
                fullName: 'GARCIA LOPEZ, MARIO'
              }
            ]
          }
        ],
        meta: {
          source: 'gesdep',
          count: 1
        }
      })
    };

    const service = new TeamReadService({
      repository: repository as any,
      onlineUseCase: onlineUseCase as any,
      cache: new MemoryCache()
    });

    await expect(service.listExtended()).resolves.toEqual({
      items: [
        {
          id: 'TEAM-1',
          name: 'Cadete A',
          category: 'Cadete',
          season: '2025-26',
          status: 'active',
          players: [
            {
              id: 'PLAYER-1',
              shortName: 'Mario',
              fullName: 'GARCIA LOPEZ, MARIO'
            }
          ]
        }
      ],
      meta: {
        source: 'gesdep',
        count: 1
      }
    });

    expect(onlineUseCase.executeExtended).toHaveBeenCalledTimes(1);
  });
});
