import { describe, expect, it, vi } from 'vitest';
import { PlayerReadService } from '../src/application/playerReadService.js';
import { MemoryCache } from '../src/shared/memoryCache.js';

describe('PlayerReadService', () => {
  it('returns MySQL player when present in repository', async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue({
        id: 'PLAYER-1',
        shortName: 'Mario',
        fullName: 'GARCIA LOPEZ, MARIO',
        fields: {
          equipo: 'Cadete A'
        }
      })
    };

    const onlineUseCase = {
      execute: vi.fn()
    };

    const service = new PlayerReadService({
      repository: repository as any,
      onlineUseCase: onlineUseCase as any,
      cache: new MemoryCache()
    });

    await expect(service.getById('PLAYER-1')).resolves.toEqual({
      item: {
        id: 'PLAYER-1',
        shortName: 'Mario',
        fullName: 'GARCIA LOPEZ, MARIO',
        fields: {
          equipo: 'Cadete A'
        }
      },
      meta: {
        source: 'mysql'
      }
    });

    expect(onlineUseCase.execute).not.toHaveBeenCalled();
  });

  it('falls back to online when repository misses the player', async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(null)
    };

    const onlineUseCase = {
      execute: vi.fn().mockResolvedValue({
        item: {
          id: 'PLAYER-2',
          shortName: 'Samu',
          fullName: 'ESTEBAN, SAMU',
          fields: {}
        },
        meta: {
          source: 'gesdep'
        }
      })
    };

    const service = new PlayerReadService({
      repository: repository as any,
      onlineUseCase: onlineUseCase as any,
      cache: new MemoryCache()
    });

    await expect(service.getById('PLAYER-2')).resolves.toEqual({
      item: {
        id: 'PLAYER-2',
        shortName: 'Samu',
        fullName: 'ESTEBAN, SAMU',
        fields: {}
      },
      meta: {
        source: 'gesdep'
      }
    });
  });
});
