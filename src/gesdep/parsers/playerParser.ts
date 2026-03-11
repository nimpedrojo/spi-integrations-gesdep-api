import { load } from 'cheerio';
import { PlayerDetail } from '../../domain/types.js';
import { selectors } from '../selectors/index.js';
import { ParsingError } from '../../shared/errors.js';

const normalizeText = (value?: string) => {
  const normalized = value?.replace(/\s+/g, ' ').trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

const sanitizeFieldKey = (value: string) => value.toLowerCase().replace(/:$/, '').trim().replace(/\s+/g, '_');

export class PlayerParser {
  parse(playerId: string, html: string): PlayerDetail {
    const $ = load(html);
    const root = $(selectors.players.ready).first();

    if (root.length === 0) {
      throw new ParsingError('Invalid player page structure: content root not found', {
        selector: selectors.players.ready,
        playerId
      });
    }

    const fields: Record<string, string | null> = {};
    const card = $(selectors.players.card).first();

    if (card.length === 0) {
      throw new ParsingError('Invalid player page structure: player card not found', {
        selector: selectors.players.card,
        playerId
      });
    }

    const headerCells = $(selectors.players.headerRow).first().find('td');
    const headerLeft = normalizeText($(headerCells[0]).text()) ?? '';
    const headerRight = normalizeText($(headerCells[1]).text());

    let shortName: string | null = null;
    let fullName: string | null = null;
    const headerMatch = headerLeft.match(/^(?:(\d+)\s*-\s*)?(.+?)\s*-\s*(.+)$/);

    if (headerMatch) {
      const [, dorsal, parsedShortName, parsedFullName] = headerMatch;
      shortName = normalizeText(parsedShortName);
      fullName = normalizeText(parsedFullName);
      if (dorsal) {
        fields.dorsal = dorsal;
      }
    } else {
      fullName = headerLeft || null;
    }

    if (headerRight) {
      fields.equipo = headerRight;
    }

    $(selectors.players.sportFieldsTables).each((_tableIndex, table) => {
      $(table)
        .find('tr')
        .each((_rowIndex, row) => {
          const cells = $(row).find('td');
          if (cells.length < 2) {
            return;
          }

          const rawKey = normalizeText($(cells[0]).text());
          if (!rawKey?.endsWith(':')) {
            return;
          }

          fields[sanitizeFieldKey(rawKey)] = normalizeText($(cells[1]).text());
        });
    });

    const statsTable = $(selectors.players.statsTable).first();
    const statRows = statsTable.find('tr');
    if (statRows.length >= 2) {
      const headers = $(statRows[0])
        .find('td')
        .map((_index, cell) => sanitizeFieldKey($(cell).text()))
        .get();
      const values = $(statRows[1])
        .find('td')
        .map((_index, cell) => normalizeText($(cell).text()))
        .get();

      headers.forEach((header, index) => {
        if (!header) {
          return;
        }

        fields[`estadistica_${header}`] = values[index] ?? null;
      });
    }

    const otherSportDataChildren = $(selectors.players.otherSportData).children();
    for (let index = 0; index < otherSportDataChildren.length; index += 3) {
      const key = normalizeText($(otherSportDataChildren[index]).text());
      const value = normalizeText($(otherSportDataChildren[index + 1]).text());
      if (key) {
        fields[sanitizeFieldKey(key)] = value;
      }
    }

    const observations = normalizeText($(selectors.players.observations).text());
    if (observations) {
      fields.observaciones = observations;
    }

    const positions = $(selectors.players.positions)
      .find('td[align="left"]')
      .map((_index, cell) => normalizeText($(cell).text()))
      .get()
      .filter((value): value is string => value !== null);

    if (positions.length > 0) {
      fields.posiciones = positions.join(', ');
    }

    return {
      id: playerId,
      shortName,
      fullName,
      fields
    };
  }
}
