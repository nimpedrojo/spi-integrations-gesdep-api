import { TeamWorkStatsResponse } from '../domain/types.js';
import { TeamWorkStatsRepository } from '../db/repositories/teamWorkStatsRepository.js';
import { GetTeamWorkStatsUseCase } from './getTeamWorkStatsUseCase.js';
import { MemoryCache, memoryCache } from '../shared/memoryCache.js';

export interface TeamWorkStatsReadServiceDeps {
  repository?: TeamWorkStatsRepository;
  onlineUseCase?: GetTeamWorkStatsUseCase;
  cache?: MemoryCache;
}

export class TeamWorkStatsReadService {
  private readonly repository: TeamWorkStatsRepository;
  private readonly cache: MemoryCache;

  constructor(private readonly deps: TeamWorkStatsReadServiceDeps) {
    this.repository = deps.repository ?? new TeamWorkStatsRepository();
    this.cache = deps.cache ?? memoryCache;
  }

  async get(teamId: string, from: string, to: string): Promise<TeamWorkStatsResponse> {
    const cacheKey = `team-work-stats:${teamId}:${from}:${to}`;
    return this.cache.remember(cacheKey, 300, async () => {
      if (await this.repository.hasFullCoverage(teamId, from, to)) {
        const dbPayload = await this.repository.getAggregated(teamId, from, to);
        if (dbPayload) {
          return dbPayload;
        }
      }

      if (!this.deps.onlineUseCase) {
        throw new Error(`Team work stats ${teamId} ${from}..${to} not available`);
      }

      const teamName = await this.repository.findTeamName(teamId);
      return this.deps.onlineUseCase.execute(teamId, from, to, teamName ?? undefined);
    });
  }
}
