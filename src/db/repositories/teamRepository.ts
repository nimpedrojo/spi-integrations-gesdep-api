import { Knex } from 'knex';
import { TeamItem, TeamListItem } from '../../domain/types.js';
import { db } from '../knex.js';

type TeamRow = {
  id: string;
  name: string;
  category: string | null;
  season: string | null;
  status: string | null;
};

type TeamPlayerRow = {
  team_id: string;
  player_id: string;
  sort_order: number;
  short_name: string | null;
  full_name: string | null;
};

export class TeamRepository {
  constructor(private readonly knex: Knex = db) {}

  async listBasic(): Promise<TeamListItem[]> {
    const rows = await this.knex<TeamRow>('teams')
      .select('id', 'name', 'category', 'season', 'status')
      .orderBy([{ column: 'season', order: 'desc' }, { column: 'name', order: 'asc' }]);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      season: row.season,
      status: row.status
    }));
  }

  async listExtended(): Promise<TeamItem[]> {
    const teams = await this.listBasic();
    if (teams.length === 0) {
      return [];
    }

    const playerRows = await this.knex<TeamPlayerRow>('team_players')
      .join('players', 'players.id', 'team_players.player_id')
      .select(
        'team_players.team_id',
        'team_players.player_id',
        'team_players.sort_order',
        'players.short_name',
        'players.full_name'
      )
      .whereIn('team_players.team_id', teams.map((team) => team.id))
      .orderBy([{ column: 'team_players.team_id', order: 'asc' }, { column: 'team_players.sort_order', order: 'asc' }]);

    const playersByTeamId = new Map<string, TeamItem['players']>();

    for (const row of playerRows) {
      const players = playersByTeamId.get(row.team_id) ?? [];
      players.push({
        id: row.player_id,
        shortName: row.short_name ?? '',
        fullName: row.full_name ?? ''
      });
      playersByTeamId.set(row.team_id, players);
    }

    return teams.map((team) => ({
      ...team,
      players: playersByTeamId.get(team.id) ?? []
    }));
  }

  async replaceAll(teams: TeamItem[], syncedAt: Date): Promise<void> {
    await this.knex.transaction(async (trx) => {
      await trx('team_players').del();
      await trx('teams').del();

      if (teams.length === 0) {
        return;
      }

      await trx('teams').insert(
        teams.map((team) => ({
          id: team.id,
          name: team.name,
          category: team.category,
          season: team.season,
          status: team.status,
          synced_at: syncedAt
        }))
      );

      const relations = teams.flatMap((team) =>
        team.players.map((player, index) => ({
          team_id: team.id,
          player_id: player.id,
          sort_order: index,
          synced_at: syncedAt
        }))
      );

      if (relations.length > 0) {
        await trx('team_players').insert(relations);
      }
    });
  }
}
