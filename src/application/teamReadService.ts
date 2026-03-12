import { ListTeamsExtendedResponse, ListTeamsResponse, listTeamsExtendedResponseSchema, listTeamsResponseSchema } from '../domain/types.js';
import { ListTeamsUseCase } from './listTeamsUseCase.js';
import { TeamRepository } from '../db/repositories/teamRepository.js';
import { memoryCache, MemoryCache } from '../shared/memoryCache.js';
import { config } from '../shared/config.js';

export interface TeamReadServiceDeps {
  repository?: TeamRepository;
  onlineUseCase?: ListTeamsUseCase;
  cache?: MemoryCache;
}

export class TeamReadService {
  private readonly repository: TeamRepository;
  private readonly cache: MemoryCache;

  constructor(private readonly deps: TeamReadServiceDeps) {
    this.repository = deps.repository ?? new TeamRepository();
    this.cache = deps.cache ?? memoryCache;
  }

  async listBasic(): Promise<ListTeamsResponse> {
    return this.cache.remember('teams:basic', config.CACHE_TTL_TEAMS_SECONDS, async () => {
      const items = await this.repository.listBasic();
      if (items.length > 0) {
        return listTeamsResponseSchema.parse({
          items,
          meta: {
            source: 'mysql',
            count: items.length
          }
        });
      }

      if (!this.deps.onlineUseCase) {
        return listTeamsResponseSchema.parse({
          items: [],
          meta: {
            source: 'mysql',
            count: 0
          }
        });
      }

      return this.deps.onlineUseCase.execute();
    });
  }

  async listExtended(): Promise<ListTeamsExtendedResponse> {
    return this.cache.remember('teams:extended', config.CACHE_TTL_TEAMS_EXTENDED_SECONDS, async () => {
      const items = await this.repository.listExtended();
      const hasRosterData = items.some((team) => team.players.length > 0);

      if (items.length > 0 && hasRosterData) {
        return listTeamsExtendedResponseSchema.parse({
          items,
          meta: {
            source: 'mysql',
            count: items.length
          }
        });
      }

      if (!this.deps.onlineUseCase) {
        return listTeamsExtendedResponseSchema.parse({
          items: [],
          meta: {
            source: 'mysql',
            count: 0
          }
        });
      }

      return this.deps.onlineUseCase.executeExtended();
    });
  }
}
