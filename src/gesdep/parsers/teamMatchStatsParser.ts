import { load } from 'cheerio';
import {
  MatchCompetition,
  MatchResultFilter,
  TeamMatch,
  TeamMatchesResponse,
  TeamMatchStatsResponse,
  MatchStatsBlock,
  teamMatchStatsResponseSchema,
  teamMatchesResponseSchema
} from '../../domain/types.js';
import { ParsingError } from '../../shared/errors.js';

const normalizeText = (value: string) => value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

const competitionTextToKey = (value: string): Exclude<MatchCompetition, 'all'> => {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'liga') return 'league';
  if (normalized === 'copa') return 'cup';
  if (normalized === 'amistoso') return 'friendly';
  return 'tournament';
};

const resultFromScores = (teamScore: number, opponentScore: number): Exclude<MatchResultFilter, 'all'> => {
  if (teamScore > opponentScore) return 'won';
  if (teamScore < opponentScore) return 'lost';
  return 'drawn';
};

const emptyBlock = (): MatchStatsBlock => ({
  PJ: 0,
  GA: 0,
  EM: 0,
  PE: 0,
  GF: 0,
  GC: 0,
  PTS: 0
});

const summarizeMatches = (matches: TeamMatch[]) => {
  const total = emptyBlock();
  const home = emptyBlock();
  const away = emptyBlock();

  for (const match of matches) {
    const target = match.isHome ? home : away;
    for (const block of [total, target]) {
      block.PJ += 1;
      block.GF += match.teamScore;
      block.GC += match.opponentScore;
      if (match.result === 'won') {
        block.GA += 1;
        block.PTS += 3;
      } else if (match.result === 'drawn') {
        block.EM += 1;
        block.PTS += 1;
      } else {
        block.PE += 1;
      }
    }
  }

  return { total, local: home, visitante: away };
};

const applyFilters = (
  matches: TeamMatch[],
  competition: MatchCompetition,
  result: MatchResultFilter
) => matches.filter((match) => {
  if (competition !== 'all' && match.competition !== competition) {
    return false;
  }

  if (result !== 'all' && match.result !== result) {
    return false;
  }

  return true;
});

const parseSummaryValues = (html: string) => {
  const $ = load(html);
  const values = $('#ctl00_ContentPlaceHolder1_lblEstadisticas td[bgcolor=\"White\"], #ctl00_ContentPlaceHolder1_lblEstadisticas td[bgcolor=\"white\"]')
    .map((_index, element) => normalizeText($(element).text()))
    .get()
    .filter(Boolean)
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value));

  if (values.length !== 21) {
    return null;
  }

  const toBlock = (offset: number): MatchStatsBlock => ({
    PJ: values[offset],
    GA: values[offset + 1],
    EM: values[offset + 2],
    PE: values[offset + 3],
    GF: values[offset + 4],
    GC: values[offset + 5],
    PTS: values[offset + 6]
  });

  return {
    total: toBlock(0),
    local: toBlock(7),
    visitante: toBlock(14)
  };
};

const extractMatchIdFromOnClick = (value?: string | null) => {
  if (!value) return null;
  const match = value.match(/[?&]idp=([^"&]+)/i);
  return match?.[1] ?? null;
};

export class TeamMatchStatsParser {
  private parseMatches(html: string) {
    const $ = load(html);
    const teamId = $('#ctl00_ContentPlaceHolder1_cmbEquipos').val()?.toString() ?? null;
    const teamName = normalizeText($('#ctl00_ContentPlaceHolder1_cmbEquipos option:selected').text()) || null;
    const competitionSelected = $('#ctl00_ContentPlaceHolder1_cmbCompeticiones').val()?.toString() ?? '0';
    const resultSelected = ($('#ctl00_ContentPlaceHolder1_verGanados').is(':checked') && 'won')
      || ($('#ctl00_ContentPlaceHolder1_verEmpatados').is(':checked') && 'drawn')
      || ($('#ctl00_ContentPlaceHolder1_VerPerdidos').is(':checked') && 'lost')
      || 'all';

    if (!teamId) {
      throw new ParsingError('Invalid match stats page structure: selected team not found');
    }

    const matches: TeamMatch[] = [];
    $('#ctl00_ContentPlaceHolder1_lblLista tr[onclick*="idp="]').each((_index, row) => {
      const cells = $(row).find('td');
      if (cells.length < 8) {
        return;
      }

      const homeOrTeam = normalizeText($(cells[1]).text());
      const leftScore = Number(normalizeText($(cells[2]).text()));
      const rightScore = Number(normalizeText($(cells[3]).text()));
      const awayOrTeam = normalizeText($(cells[4]).text());
      const kickoffAt = normalizeText($(cells[5]).text());
      const venue = normalizeText($(cells[6]).text()) || null;
      const competition = competitionTextToKey(normalizeText($(cells[7]).text()));

      const isHome = normalizeText(awayOrTeam) !== normalizeText(teamName ?? '');
      const opponentName = isHome ? awayOrTeam : homeOrTeam;
      const teamScore = isHome ? leftScore : rightScore;
      const opponentScore = isHome ? rightScore : leftScore;

      matches.push({
        matchId: extractMatchIdFromOnClick($(row).attr('onclick')) ?? `${teamId}-${kickoffAt}-${opponentName}`,
        teamId,
        teamName: teamName ?? '',
        opponentName,
        isHome,
        teamScore,
        opponentScore,
        result: resultFromScores(teamScore, opponentScore),
        competition,
        kickoffAt,
        venue
      });
    });

    return {
      teamId,
      teamName,
      competitionSelected,
      resultSelected,
      matches
    };
  }

  parse(html: string): TeamMatchStatsResponse['item'] {
    const parsed = this.parseMatches(html);
    const stats = parseSummaryValues(html) ?? summarizeMatches(parsed.matches);

    return teamMatchStatsResponseSchema.shape.item.parse({
      teamId: parsed.teamId,
      teamName: parsed.teamName,
      filters: {
        competition:
          parsed.competitionSelected === '1' ? 'league'
            : parsed.competitionSelected === '2' ? 'cup'
              : parsed.competitionSelected === '3' ? 'friendly'
                : parsed.competitionSelected === '4' ? 'tournament'
                  : 'all',
        result: parsed.resultSelected
      },
      stats
    });
  }

  parseWithMatches(html: string) {
    const parsed = this.parseMatches(html);

    return {
      item: this.parse(html),
      matches: parsed.matches
    };
  }

  buildStatsFromMatches(
    teamId: string,
    teamName: string | null,
    matches: TeamMatch[],
    competition: MatchCompetition,
    result: MatchResultFilter
  ): TeamMatchStatsResponse['item'] {
    const filteredMatches = applyFilters(matches, competition, result);

    return teamMatchStatsResponseSchema.shape.item.parse({
      teamId,
      teamName,
      filters: {
        competition,
        result
      },
      stats: summarizeMatches(filteredMatches)
    });
  }

  buildMatchesResponse(
    teamId: string,
    teamName: string | null,
    matches: TeamMatch[],
    competition: MatchCompetition,
    result: MatchResultFilter
  ): TeamMatchesResponse['item'] {
    return teamMatchesResponseSchema.shape.item.parse({
      teamId,
      teamName,
      filters: {
        competition,
        result
      },
      matches: applyFilters(matches, competition, result)
    });
  }
}
