import {
  MatchCompetition,
  MatchResultFilter,
  TeamMatch,
  TeamMatchesResponse,
  TeamMatchStatsResponse,
  teamMatchStatsResponseSchema,
  teamMatchesResponseSchema
} from '../domain/types.js';
import { TeamMatchStatsParser } from '../gesdep/parsers/teamMatchStatsParser.js';
import { saveHtmlSnapshot } from '../gesdep/utils/artifacts.js';

export interface TeamMatchStatsNavigator {
  fetchTeamMatchStatsHtml(
    teamId: string,
    competition: MatchCompetition,
    result: MatchResultFilter,
    teamName?: string
  ): Promise<string>;
}

export interface GetTeamMatchStatsUseCaseDeps {
  navigator: TeamMatchStatsNavigator;
  parser?: TeamMatchStatsParser;
}

export class GetTeamMatchStatsUseCase {
  private readonly parser: TeamMatchStatsParser;

  constructor(private readonly deps: GetTeamMatchStatsUseCaseDeps) {
    this.parser = deps.parser ?? new TeamMatchStatsParser();
  }

  async execute(
    teamId: string,
    competition: MatchCompetition = 'all',
    result: MatchResultFilter = 'all',
    teamName?: string
  ): Promise<TeamMatchStatsResponse> {
    const html = await this.deps.navigator.fetchTeamMatchStatsHtml(teamId, competition, result, teamName);

    try {
      const parsed = this.parser.parse(html);
      return teamMatchStatsResponseSchema.parse({
        item: {
          ...parsed,
          teamId,
          teamName: parsed.teamName ?? teamName ?? null,
          filters: {
            competition,
            result
          }
        },
        meta: {
          source: 'gesdep'
        }
      });
    } catch (error) {
      const snapshotPath = await saveHtmlSnapshot(html, 'team-match-stats-parse-failed');
      if (error instanceof Error) {
        error.message = `${error.message}. HTML snapshot saved at ${snapshotPath}`;
      }
      throw error;
    }
  }

  async executeMatches(
    teamId: string,
    competition: MatchCompetition = 'all',
    result: MatchResultFilter = 'all',
    teamName?: string
  ): Promise<TeamMatchesResponse> {
    const html = await this.deps.navigator.fetchTeamMatchStatsHtml(teamId, competition, result, teamName);

    try {
      const parsed = this.parser.parseWithMatches(html);
      return teamMatchesResponseSchema.parse({
        item: this.parser.buildMatchesResponse(
          teamId,
          parsed.item.teamName ?? teamName ?? null,
          parsed.matches as TeamMatch[],
          competition,
          result
        ),
        meta: {
          source: 'gesdep'
        }
      });
    } catch (error) {
      const snapshotPath = await saveHtmlSnapshot(html, 'team-matches-parse-failed');
      if (error instanceof Error) {
        error.message = `${error.message}. HTML snapshot saved at ${snapshotPath}`;
      }
      throw error;
    }
  }

  async executeAllSnapshots(
    teamId: string,
    teamName?: string
  ): Promise<{
    matches: TeamMatch[];
    teamName: string | null;
    snapshots: Array<{ competition: MatchCompetition; result: MatchResultFilter; item: TeamMatchStatsResponse['item'] }>;
  }> {
    const html = await this.deps.navigator.fetchTeamMatchStatsHtml(teamId, 'all', 'all', teamName);

    try {
      const parsed = this.parser.parseWithMatches(html);
      const competitions: MatchCompetition[] = ['all', 'league', 'cup', 'friendly', 'tournament'];
      const results: MatchResultFilter[] = ['all', 'won', 'drawn', 'lost'];

      return {
        matches: parsed.matches as TeamMatch[],
        teamName: parsed.item.teamName ?? teamName ?? null,
        snapshots: competitions.flatMap((competition) =>
          results.map((result) => ({
            competition,
            result,
            item: this.parser.buildStatsFromMatches(
              teamId,
              parsed.item.teamName ?? teamName ?? null,
              parsed.matches as TeamMatch[],
              competition,
              result
            )
          }))
        )
      };
    } catch (error) {
      const snapshotPath = await saveHtmlSnapshot(html, 'team-match-stats-parse-failed');
      if (error instanceof Error) {
        error.message = `${error.message}. HTML snapshot saved at ${snapshotPath}`;
      }
      throw error;
    }
  }
}
