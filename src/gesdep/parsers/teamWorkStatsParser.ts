import { load } from 'cheerio';
import { ParsingError } from '../../shared/errors.js';
import { TeamWorkExerciseStat, TeamWorkMethodStat } from '../../domain/types.js';

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').replace(/\u00a0/g, ' ').trim();

const extractArrayLiteral = (html: string, key: 'categories' | 'data') => {
  const match = html.match(new RegExp(`${key}:\\s*(\\[[\\s\\S]*?\\])\\s*(?:,|})`));
  if (!match?.[1]) {
    throw new ParsingError(`Invalid work stats page structure: ${key} array not found`);
  }

  return JSON.parse(match[1].replace(/'/g, '"')) as Array<string | number>;
};

const extractExerciseIdFromHref = (href?: string | null) => {
  if (!href) {
    return null;
  }

  const match = href.match(/[?&]id=([^&]+)/i);
  return match?.[1] ?? null;
};

export class TeamWorkStatsParser {
  parse(html: string) {
    const $ = load(html);
    const teamId = $('#ctl00_ContentPlaceHolder1_cmbEquipos').val()?.toString() ?? null;
    const teamName = normalizeText($('#ctl00_ContentPlaceHolder1_cmbEquipos option:selected').text()) || null;
    const from = ($('#ctl00_ContentPlaceHolder1_txtDesde').val()?.toString() ?? '').trim();
    const to = ($('#ctl00_ContentPlaceHolder1_txtHasta').val()?.toString() ?? '').trim();

    if (!teamId) {
      throw new ParsingError('Invalid work stats page structure: selected team not found');
    }

    const categories = extractArrayLiteral(html, 'categories');
    const minutes = extractArrayLiteral(html, 'data');

    if (categories.length !== minutes.length) {
      throw new ParsingError('Invalid work stats page structure: chart arrays length mismatch');
    }

    const methods: TeamWorkMethodStat[] = categories.map((category, index) => ({
      method: normalizeText(String(category)),
      minutes: Number(minutes[index] ?? 0)
    }));

    const topExercises: TeamWorkExerciseStat[] = [];
    $('#ctl00_ContentPlaceHolder1_lblTop20 tr').each((index, row) => {
      const title = normalizeText($(row).find('td:nth-child(2) .font-blue').first().text()).replace(/^#\d+\s*/i, '');
      const minutesText = normalizeText($(row).find('td:nth-child(2) > div').last().text());
      const minutesMatch = minutesText.match(/(\d+)/);

      if (!title || !minutesMatch) {
        return;
      }

      const link = $(row).find('td:first-child a').first();
      const image = $(row).find('td:first-child img').first();
      const imageUrl = image.attr('src')?.trim() ?? null;

      topExercises.push({
        rank: index + 1,
        exerciseId: extractExerciseIdFromHref(link.attr('href')),
        title,
        minutes: Number(minutesMatch[1]),
        imageUrl: imageUrl && imageUrl.length > 0 ? imageUrl : null
      });
    });

    return {
      teamId,
      teamName,
      from,
      to,
      methods,
      topExercises
    };
  }
}
