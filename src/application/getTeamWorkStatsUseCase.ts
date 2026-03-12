import { TeamWorkStatsResponse, teamWorkStatsResponseSchema } from '../domain/types.js';
import { TeamWorkStatsParser } from '../gesdep/parsers/teamWorkStatsParser.js';
import { saveHtmlSnapshot } from '../gesdep/utils/artifacts.js';

export interface TeamWorkStatsNavigator {
  fetchTeamWorkStatsHtml(teamId: string, from: string, to: string): Promise<string>;
}

export interface GetTeamWorkStatsUseCaseDeps {
  navigator: TeamWorkStatsNavigator;
  parser?: TeamWorkStatsParser;
}

export class GetTeamWorkStatsUseCase {
  private readonly parser: TeamWorkStatsParser;

  constructor(private readonly deps: GetTeamWorkStatsUseCaseDeps) {
    this.parser = deps.parser ?? new TeamWorkStatsParser();
  }

  async execute(teamId: string, from: string, to: string): Promise<TeamWorkStatsResponse> {
    const html = await this.deps.navigator.fetchTeamWorkStatsHtml(teamId, from, to);

    try {
      return teamWorkStatsResponseSchema.parse({
        item: this.parser.parse(html),
        meta: {
          source: 'gesdep'
        }
      });
    } catch (error) {
      const snapshotPath = await saveHtmlSnapshot(html, 'team-work-stats-parse-failed');
      if (error instanceof Error) {
        error.message = `${error.message}. HTML snapshot saved at ${snapshotPath}`;
      }
      throw error;
    }
  }
}
