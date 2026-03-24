import { MatchCompetition, MatchResultFilter, TeamMatchesResponse } from '../domain/types.js';
import { TeamMatchesRepository } from '../db/repositories/teamMatchesRepository.js';
import { GetTeamMatchStatsUseCase } from './getTeamMatchStatsUseCase.js';
import { MemoryCache, memoryCache } from '../shared/memoryCache.js';

export interface TeamMatchesReadServiceDeps {
  repository?: TeamMatchesRepository;
  onlineUseCase?: GetTeamMatchStatsUseCase;
  cache?: MemoryCache;
}

export class TeamMatchesReadService {
  private readonly repository: TeamMatchesRepository;
  private readonly cache: MemoryCache;

  constructor(private readonly deps: TeamMatchesReadServiceDeps) {
    this.repository = deps.repository ?? new TeamMatchesRepository();
    this.cache = deps.cache ?? memoryCache;
  }

  async list(
    teamId: string,
    competition: MatchCompetition = 'all',
    result: MatchResultFilter = 'all'
  ): Promise<TeamMatchesResponse> {
    const cacheKey = `team-matches:${teamId}:${competition}:${result}`;
    return this.cache.remember(cacheKey, 300, async () => {
      const dbPayload = await this.repository.list(teamId, competition, result);
      if (dbPayload) {
        return dbPayload;
      }

      if (!this.deps.onlineUseCase) {
        throw new Error(`Team matches ${teamId} not available`);
      }

      const teamName = await this.repository.findTeamName(teamId);
      return this.deps.onlineUseCase.executeMatches(teamId, competition, result, teamName ?? undefined);
    });
  }
}
