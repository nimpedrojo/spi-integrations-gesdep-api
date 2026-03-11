import { load, type CheerioAPI } from 'cheerio';
import type { AnyNode } from 'domhandler';
import { TeamListItem, TeamItem, TeamPlayer } from '../../domain/types.js';
import { selectors } from '../selectors/index.js';
import { ParsingError } from '../../shared/errors.js';

const normalizeText = (value?: string) => {
  const normalized = value?.replace(/\s+/g, ' ').trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

const extractTeamIdFromHref = (href?: string | null) => {
  if (!href) {
    return null;
  }

  const match = href.match(/[?&]idequ=([^&]+)/i);
  return match?.[1] ?? null;
};

const extractPlayerIdFromOnClick = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const match = value.match(/[?&]idjug=([^"&]+)/i);
  return match?.[1] ?? null;
};

const extractSeason = (value: string | null) => {
  if (!value) {
    return null;
  }

  const match = value.match(/temporada\s+(.+)$/i);
  return match?.[1]?.trim() ?? value;
};

const extractLabeledValue = ($: CheerioAPI, rootSelector: string, label: string) => {
  const root = $(rootSelector).first();
  if (root.length === 0) {
    return null;
  }

  const row = root.find('tr').filter((_index, element) => {
    const firstCellText = normalizeText($(element).find('td').first().text());
    return firstCellText?.toLowerCase().startsWith(label.toLowerCase()) ?? false;
  }).first();

  if (row.length === 0) {
    return null;
  }

  return normalizeText(row.find('td').eq(1).text());
};

export class TeamsParser {
  parse(html: string): TeamListItem[] {
    const $ = load(html);
    const list = $(selectors.teams.list).first();

    if (list.length === 0) {
      throw new ParsingError('Invalid teams page structure: teams list not found', {
        selector: selectors.teams.list
      });
    }

    const itemsRoot = list.find(selectors.teams.item);
    if (itemsRoot.length === 0) {
      throw new ParsingError('Invalid teams page structure: teams items not found', {
        selector: selectors.teams.item
      });
    }

    const panelTitle = normalizeText($(selectors.teams.activePanelTitle).first().text());
    const status = panelTitle?.toLowerCase().includes('activos') ? 'active' : null;
    const season = extractSeason(normalizeText($(selectors.teams.season).first().text()));
    const items: TeamListItem[] = [];

    itemsRoot.each((_index, row) => {
      const link = $(row).find(selectors.teams.link).first();
      const id = extractTeamIdFromHref(link.attr('href'));
      const name = normalizeText(link.find(selectors.teams.name).first().text());

      if (!id || !name) {
        return;
      }

      items.push({
        id,
        name,
        category: null,
        season,
        status
      });
    });

    return items;
  }

  parseTeamDetails(html: string): Pick<TeamItem, 'category' | 'players'> {
    const $ = load(html);
    const playersRoot = $(selectors.teams.detailPlayers).first();

    if (playersRoot.length === 0) {
      throw new ParsingError('Invalid team detail structure: players list not found', {
        selector: selectors.teams.detailPlayers
      });
    }

    const players: TeamPlayer[] = [];

    playersRoot.find(selectors.teams.detailPlayerRow).each((_index, row) => {
      const id = extractPlayerIdFromOnClick($(row).attr('onclick'));
      const shortName = normalizeText($(row).find(selectors.teams.detailPlayerShortName).first().text());
      const fullName = normalizeText($(row).find(selectors.teams.detailPlayerFullName).first().text());

      if (!id || !shortName || !fullName) {
        return;
      }

      players.push({
        id,
        shortName,
        fullName
      });
    });

    return {
      category: extractLabeledValue($, selectors.teams.detailSummary, 'Categoría:'),
      players
    };
  }
}
