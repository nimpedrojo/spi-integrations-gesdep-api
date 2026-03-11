import { GetPlayerResponse, getPlayerResponseSchema } from '../domain/types.js';
import { PlayerParser } from '../gesdep/parsers/playerParser.js';
import { saveHtmlSnapshot } from '../gesdep/utils/artifacts.js';
import { ParsingError } from '../shared/errors.js';

export interface PlayerNavigator {
  fetchPlayerHtml(playerId: string): Promise<string>;
}

export interface GetPlayerUseCaseDeps {
  navigator: PlayerNavigator;
  parser?: PlayerParser;
}

export class GetPlayerUseCase {
  private readonly parser: PlayerParser;

  constructor(private readonly deps: GetPlayerUseCaseDeps) {
    this.parser = deps.parser ?? new PlayerParser();
  }

  async execute(playerId: string): Promise<GetPlayerResponse> {
    const html = await this.deps.navigator.fetchPlayerHtml(playerId);

    try {
      const item = this.parser.parse(playerId, html);
      return getPlayerResponseSchema.parse({
        item,
        meta: {
          source: 'gesdep'
        }
      });
    } catch (error) {
      if (error instanceof ParsingError) {
        const snapshotPath = await saveHtmlSnapshot(html, `player-${playerId}-parse-failed`);
        error.context = { ...error.context, snapshotPath };
      }

      throw error;
    }
  }
}
