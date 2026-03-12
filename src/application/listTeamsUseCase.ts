import {
  ListTeamsExtendedResponse,
  ListTeamsResponse,
  TeamItem,
  TeamPlayer,
  listTeamsExtendedResponseSchema,
  listTeamsResponseSchema
} from '../domain/types.js';
import { TeamsParser } from '../gesdep/parsers/teamsParser.js';
import { saveHtmlSnapshot } from '../gesdep/utils/artifacts.js';
import { ParsingError } from '../shared/errors.js';

export interface TeamsNavigator {
  fetchTeamsHtml(): Promise<string>;
  fetchTeamHtml(teamId: string): Promise<string>;
  fetchTeamHtmlBatch?(teamIds: string[]): Promise<Record<string, string>>;
}

export interface ListTeamsUseCaseDeps {
  navigator: TeamsNavigator;
  parser?: TeamsParser;
}

export interface TeamPlayerWithReference extends TeamPlayer {
  detailPath: string | null;
}

export interface TeamItemWithPlayerReferences extends Omit<TeamItem, 'players'> {
  players: TeamPlayerWithReference[];
}

export class ListTeamsUseCase {
  private readonly parser: TeamsParser;

  constructor(private readonly deps: ListTeamsUseCaseDeps) {
    this.parser = deps.parser ?? new TeamsParser();
  }

  async execute(): Promise<ListTeamsResponse> {
    const html = await this.deps.navigator.fetchTeamsHtml();

    try {
      const items = this.parser.parse(html);
      return listTeamsResponseSchema.parse({
        items,
        meta: {
          source: 'gesdep',
          count: items.length
        }
      });
    } catch (error) {
      if (error instanceof ParsingError) {
        const snapshotPath = await saveHtmlSnapshot(html, 'teams-parse-failed');
        error.context = { ...error.context, snapshotPath };
      }

      throw error;
    }
  }

  async executeExtended(): Promise<ListTeamsExtendedResponse> {
    const items = await this.executeExtendedWithPlayerReferences();

    return listTeamsExtendedResponseSchema.parse({
      items: items.map((item) => ({
        ...item,
        players: item.players.map((player) => ({
          id: player.id,
          shortName: player.shortName,
          fullName: player.fullName
        }))
      })),
      meta: {
        source: 'gesdep',
        count: items.length
      }
    });
  }

  async executeExtendedWithPlayerReferences(): Promise<TeamItemWithPlayerReferences[]> {
    const html = await this.deps.navigator.fetchTeamsHtml();

    try {
      const items = this.parser.parse(html);
      const detailHtmlByTeamId = this.deps.navigator.fetchTeamHtmlBatch
        ? await this.deps.navigator.fetchTeamHtmlBatch(items.map((item) => item.id))
        : Object.fromEntries(await Promise.all(items.map(async (item) => [item.id, await this.deps.navigator.fetchTeamHtml(item.id)])));

      const enrichedItems: TeamItemWithPlayerReferences[] = items.map((item) => ({
        ...item,
        players: []
      }));

      for (const item of enrichedItems) {
        const teamHtml = detailHtmlByTeamId[item.id];

        if (!teamHtml) {
          continue;
        }

        const detail = this.parser.parseTeamDetailsWithReferences(teamHtml);
        item.category = detail.category;
        item.players = detail.players;
      }

      return enrichedItems;
    } catch (error) {
      if (error instanceof ParsingError) {
        const snapshotPath = await saveHtmlSnapshot(html, 'teams-parse-failed');
        error.context = { ...error.context, snapshotPath };
      }

      throw error;
    }
  }
}
