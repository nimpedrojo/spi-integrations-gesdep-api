import { GetPlayerResponse, getPlayerResponseSchema } from '../domain/types.js';
import { PlayerRepository } from '../db/repositories/playerRepository.js';
import { GetPlayerUseCase } from './getPlayerUseCase.js';
import { memoryCache, MemoryCache } from '../shared/memoryCache.js';
import { config } from '../shared/config.js';

export interface PlayerReadServiceDeps {
  repository?: PlayerRepository;
  onlineUseCase?: GetPlayerUseCase;
  cache?: MemoryCache;
}

export class PlayerReadService {
  private readonly repository: PlayerRepository;
  private readonly cache: MemoryCache;

  constructor(private readonly deps: PlayerReadServiceDeps) {
    this.repository = deps.repository ?? new PlayerRepository();
    this.cache = deps.cache ?? memoryCache;
  }

  async getById(playerId: string): Promise<GetPlayerResponse> {
    return this.cache.remember(`player:${playerId}`, config.CACHE_TTL_PLAYER_SECONDS, async () => {
      const item = await this.repository.findById(playerId);
      if (item) {
        return getPlayerResponseSchema.parse({
          item,
          meta: {
            source: 'mysql'
          }
        });
      }

      if (!this.deps.onlineUseCase) {
        throw new Error(`Player ${playerId} not found`);
      }

      return this.deps.onlineUseCase.execute(playerId);
    });
  }
}
