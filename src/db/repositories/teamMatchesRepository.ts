import { Knex } from 'knex';
import {
  MatchCompetition,
  MatchResultFilter,
  TeamMatch,
  TeamMatchesResponse,
  teamMatchesResponseSchema
} from '../../domain/types.js';
import { db } from '../knex.js';

type TeamMatchRow = {
  team_id: string;
  match_id: string;
  team_name: string | null;
  opponent_name: string;
  is_home: number | boolean;
  team_score: number;
  opponent_score: number;
  result: Exclude<MatchResultFilter, 'all'>;
  competition: Exclude<MatchCompetition, 'all'>;
  kickoff_at: string;
  venue: string | null;
};

export class TeamMatchesRepository {
  constructor(private readonly knex: Knex = db) {}

  async findTeamName(teamId: string): Promise<string | null> {
    const team = await this.knex('teams').select('name').where({ id: teamId }).first();
    return team?.name ?? null;
  }

  async list(
    teamId: string,
    competition: MatchCompetition,
    result: MatchResultFilter
  ): Promise<TeamMatchesResponse | null> {
    const teamName = await this.findTeamName(teamId);
    if (!teamName) {
      return null;
    }

    const query = this.knex<TeamMatchRow>('team_matches')
      .select('*')
      .where({ team_id: teamId })
      .orderBy('kickoff_at', 'desc');

    if (competition !== 'all') {
      query.andWhere({ competition });
    }

    if (result !== 'all') {
      query.andWhere({ result });
    }

    const rows = await query;

    return teamMatchesResponseSchema.parse({
      item: {
        teamId,
        teamName: rows[0]?.team_name ?? teamName,
        filters: {
          competition,
          result
        },
        matches: rows.map((row): TeamMatch => ({
          matchId: row.match_id,
          teamId: row.team_id,
          teamName: row.team_name ?? '',
          opponentName: row.opponent_name,
          isHome: Boolean(row.is_home),
          teamScore: row.team_score,
          opponentScore: row.opponent_score,
          result: row.result,
          competition: row.competition,
          kickoffAt: row.kickoff_at,
          venue: row.venue
        }))
      },
      meta: {
        source: 'mysql'
      }
    });
  }

  async replaceTeamMatches(teamId: string, teamName: string | null, matches: TeamMatch[], syncedAt: Date): Promise<void> {
    await this.knex.transaction(async (trx) => {
      await trx('team_matches').where({ team_id: teamId }).del();

      if (matches.length === 0) {
        return;
      }

      await trx('team_matches').insert(
        matches.map((match) => ({
          team_id: teamId,
          match_id: match.matchId,
          team_name: teamName,
          opponent_name: match.opponentName,
          is_home: match.isHome,
          team_score: match.teamScore,
          opponent_score: match.opponentScore,
          result: match.result,
          competition: match.competition,
          kickoff_at: match.kickoffAt,
          venue: match.venue,
          synced_at: syncedAt
        }))
      );
    });
  }
}
