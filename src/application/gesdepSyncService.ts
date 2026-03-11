import { Knex } from 'knex';
import { ListTeamsUseCase } from './listTeamsUseCase.js';
import { GetPlayerUseCase } from './getPlayerUseCase.js';
import { db } from '../db/knex.js';
import { ensureDatabaseSchema } from '../db/schema.js';
import { TeamItem } from '../domain/types.js';
import { logger } from '../shared/logger.js';
import { memoryCache } from '../shared/memoryCache.js';

export interface GesdepSyncServiceDeps {
  teamsUseCase: ListTeamsUseCase;
  playerUseCase: GetPlayerUseCase;
  knex?: Knex;
}

export class GesdepSyncService {
  private readonly knex: Knex;

  constructor(private readonly deps: GesdepSyncServiceDeps) {
    this.knex = deps.knex ?? db;
  }

  async syncAll() {
    await ensureDatabaseSchema();

    const startedAt = new Date();
    const [runId] = await this.knex('sync_runs').insert({
      job_name: 'daily_gesdep_sync',
      status: 'running',
      started_at: startedAt,
      details_json: JSON.stringify({})
    });

    try {
      const teamsResponse = await this.deps.teamsUseCase.executeExtended();
      const teams = teamsResponse.items;
      const uniquePlayerIds = [...new Set(teams.flatMap((team) => team.players.map((player) => player.id)))];

      logger.info({ teams: teams.length, players: uniquePlayerIds.length }, 'Starting Gesdep batch sync');

      const playerDetails = await Promise.all(uniquePlayerIds.map(async (playerId) => (await this.deps.playerUseCase.execute(playerId)).item));
      const playerDetailsById = new Map(playerDetails.map((player) => [player.id, player]));
      const syncedAt = new Date();

      await this.knex.transaction(async (trx) => {
        await trx('team_players').del();
        await trx('teams').del();
        await trx('players').del();

        if (playerDetails.length > 0) {
          await trx('players').insert(
            playerDetails.map((player) => ({
              id: player.id,
              short_name: player.shortName,
              full_name: player.fullName,
              fields_json: JSON.stringify(player.fields),
              synced_at: syncedAt
            }))
          );
        }

        if (teams.length > 0) {
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

          const relations = this.toTeamPlayerRows(teams, playerDetailsById, syncedAt);
          if (relations.length > 0) {
            await trx('team_players').insert(relations);
          }
        }
      });

      await this.knex('sync_runs')
        .where({ id: runId })
        .update({
          status: 'success',
          finished_at: new Date(),
          details_json: JSON.stringify({
            teams: teams.length,
            players: playerDetails.length
          })
        });

      memoryCache.clear();

      return {
        teams: teams.length,
        players: playerDetails.length
      };
    } catch (error) {
      await this.knex('sync_runs')
        .where({ id: runId })
        .update({
          status: 'failed',
          finished_at: new Date(),
          details_json: JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown sync error'
          })
        });

      throw error;
    }
  }

  private toTeamPlayerRows(teams: TeamItem[], playerDetailsById: Map<string, { id: string }>, syncedAt: Date) {
    return teams.flatMap((team) =>
      team.players
        .filter((player) => playerDetailsById.has(player.id))
        .map((player, index) => ({
          team_id: team.id,
          player_id: player.id,
          sort_order: index,
          synced_at: syncedAt
        }))
    );
  }
}
