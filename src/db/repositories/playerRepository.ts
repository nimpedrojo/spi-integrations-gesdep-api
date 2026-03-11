import { Knex } from 'knex';
import { PlayerDetail } from '../../domain/types.js';
import { db } from '../knex.js';

type PlayerRow = {
  id: string;
  short_name: string | null;
  full_name: string | null;
  fields_json: string | Record<string, string | null>;
};

export class PlayerRepository {
  constructor(private readonly knex: Knex = db) {}

  async findById(id: string): Promise<PlayerDetail | null> {
    const row = await this.knex<PlayerRow>('players')
      .select('id', 'short_name', 'full_name', 'fields_json')
      .where({ id })
      .first();

    if (!row) {
      return null;
    }

    const parsedFields =
      typeof row.fields_json === 'string'
        ? (JSON.parse(row.fields_json) as Record<string, string | null>)
        : row.fields_json;

    return {
      id: row.id,
      shortName: row.short_name,
      fullName: row.full_name,
      fields: parsedFields
    };
  }

  async replaceAll(players: PlayerDetail[], syncedAt: Date): Promise<void> {
    if (players.length === 0) {
      await this.knex('players').del();
      return;
    }

    await this.knex.transaction(async (trx) => {
      await trx('players').del();
      await trx('players').insert(
        players.map((player) => ({
          id: player.id,
          short_name: player.shortName,
          full_name: player.fullName,
          fields_json: JSON.stringify(player.fields),
          synced_at: syncedAt
        }))
      );
    });
  }
}
