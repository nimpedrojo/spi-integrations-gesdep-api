import { Knex } from 'knex';
import { ListTeamsUseCase } from './listTeamsUseCase.js';
import { GetPlayerUseCase } from './getPlayerUseCase.js';
import { db } from '../db/knex.js';
import { ensureDatabaseSchema } from '../db/schema.js';
import { TeamItem } from '../domain/types.js';
import { logger } from '../shared/logger.js';
import { memoryCache } from '../shared/memoryCache.js';
import { GetTeamWorkStatsUseCase } from './getTeamWorkStatsUseCase.js';
import { TeamWorkStatsRepository } from '../db/repositories/teamWorkStatsRepository.js';

const normalizeComparableText = (value: string | null | undefined) =>
  value
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase() ?? '';

const toComparableNameTokens = (value: string | null | undefined) =>
  normalizeComparableText(value)
    .replace(/,/g, ' ')
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
    .sort()
    .join(' ');

export interface GesdepSyncServiceDeps {
  teamsUseCase: ListTeamsUseCase;
  playerUseCase: GetPlayerUseCase;
  teamWorkStatsUseCase?: GetTeamWorkStatsUseCase;
  teamWorkStatsRepository?: TeamWorkStatsRepository;
  knex?: Knex;
}

export class GesdepSyncService {
  private readonly knex: Knex;
  private readonly teamWorkStatsRepository: TeamWorkStatsRepository;

  constructor(private readonly deps: GesdepSyncServiceDeps) {
    this.knex = deps.knex ?? db;
    this.teamWorkStatsRepository = deps.teamWorkStatsRepository ?? new TeamWorkStatsRepository(this.knex);
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
      const rosterPlayerById = new Map(teams.flatMap((team) => team.players.map((player) => [player.id, player] as const)));
      const syncedAt = new Date();

      logger.info({ teams: teams.length, players: uniquePlayerIds.length }, 'Starting Gesdep batch sync');

      const basicPlayers = uniquePlayerIds.map((playerId) => {
        const rosterPlayer = rosterPlayerById.get(playerId);
        return {
          id: playerId,
          shortName: rosterPlayer?.shortName ?? null,
          fullName: rosterPlayer?.fullName ?? null,
          fields: {}
        };
      });

      await this.knex.transaction(async (trx) => {
        await trx('team_players').del();
        await trx('players').del();
        await trx('teams').del();

        if (basicPlayers.length > 0) {
          await trx('players').insert(
            basicPlayers.map((player) => ({
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

          const relations = this.toTeamPlayerRows(teams, new Set(basicPlayers.map((player) => player.id)), syncedAt);
          if (relations.length > 0) {
            await trx('team_players').insert(relations);
          }
        }
      });

      let detailedPlayers = 0;
      let dailyTeamWorkStats = 0;

      try {
        const playerDetails = await this.deps.playerUseCase.executeBatch(uniquePlayerIds);
        const sanitizedPlayerDetails = this.sanitizePlayerDetailsAgainstRoster(playerDetails, rosterPlayerById);
        detailedPlayers = sanitizedPlayerDetails.filter((player) => Object.keys(player.fields).length > 0).length;

        if (sanitizedPlayerDetails.length > 0) {
          await this.knex.transaction(async (trx) => {
            await trx('players')
              .insert(
                sanitizedPlayerDetails.map((player) => ({
                  id: player.id,
                  short_name: player.shortName,
                  full_name: player.fullName,
                  fields_json: JSON.stringify(player.fields),
                  synced_at: syncedAt
                }))
              )
              .onConflict('id')
              .merge({
                short_name: trx.raw('VALUES(short_name)'),
                full_name: trx.raw('VALUES(full_name)'),
                fields_json: trx.raw('VALUES(fields_json)'),
                synced_at: trx.raw('VALUES(synced_at)'),
                updated_at: trx.fn.now()
              });
          });
        }
      } catch (error) {
        logger.warn(
          { err: error, teams: teams.length, players: basicPlayers.length },
          'Player detail enrichment failed; keeping basic roster snapshot'
        );
      }

      if (this.deps.teamWorkStatsUseCase) {
        const targetDate = this.getPreviousDayIso();

        for (const team of teams) {
          try {
            const stats = await this.deps.teamWorkStatsUseCase.execute(team.id, targetDate, targetDate);
            await this.teamWorkStatsRepository.replaceDaily(
              team.id,
              targetDate,
              stats.item.methods,
              stats.item.topExercises,
              syncedAt
            );
            dailyTeamWorkStats += 1;
          } catch (error) {
            logger.warn({ err: error, teamId: team.id, targetDate }, 'Daily team work stats sync failed for team');
          }
        }
      }

      await this.knex('sync_runs')
        .where({ id: runId })
        .update({
          status: 'success',
          finished_at: new Date(),
          details_json: JSON.stringify({
            teams: teams.length,
            players: basicPlayers.length,
            detailedPlayers,
            dailyTeamWorkStats
          })
        });

      memoryCache.clear();

      return {
        teams: teams.length,
        players: basicPlayers.length,
        dailyTeamWorkStats
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

  private toTeamPlayerRows(teams: TeamItem[], availablePlayerIds: Set<string>, syncedAt: Date) {
    return teams.flatMap((team) =>
      team.players
        .filter((player) => availablePlayerIds.has(player.id))
        .map((player, index) => ({
          team_id: team.id,
          player_id: player.id,
          sort_order: index,
          synced_at: syncedAt
        }))
    );
  }

  private getPreviousDayIso() {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
  }

  private sanitizePlayerDetailsAgainstRoster(
    playerDetails: Array<{ id: string; shortName: string | null; fullName: string | null; fields: Record<string, string | null> }>,
    rosterPlayerById: Map<string, { shortName: string; fullName: string }>
  ) {
    const mismatches = playerDetails.flatMap((player) => {
      const rosterPlayer = rosterPlayerById.get(player.id);
      if (!rosterPlayer) {
        return [];
      }

      const expectedFullName = normalizeComparableText(rosterPlayer.fullName);
      const actualFullName = normalizeComparableText(player.fullName);
      const expectedFullNameTokens = toComparableNameTokens(rosterPlayer.fullName);
      const actualFullNameTokens = toComparableNameTokens(player.fullName);
      const expectedShortName = normalizeComparableText(rosterPlayer.shortName);
      const actualShortName = normalizeComparableText(player.shortName);

      const fullNameMismatch =
        expectedFullName &&
        actualFullName &&
        expectedFullName !== actualFullName &&
        expectedFullNameTokens !== actualFullNameTokens;

      if (fullNameMismatch || (expectedShortName && actualShortName && expectedShortName !== actualShortName)) {
        return [
          {
            id: player.id,
            expectedFullName: rosterPlayer.fullName,
            actualFullName: player.fullName,
            expectedShortName: rosterPlayer.shortName,
            actualShortName: player.shortName
          }
        ];
      }

      return [];
    });

    if (mismatches.length > 0) {
      logger.warn({
        mismatchCount: mismatches.length,
        sample: mismatches.slice(0, 5)
      }, 'Some fetched player details did not match the expected roster players; using roster fallback for those players');
    }

    return playerDetails.map((player) => {
      const rosterPlayer = rosterPlayerById.get(player.id);
      if (!rosterPlayer) {
        return player;
      }

      const expectedFullName = normalizeComparableText(rosterPlayer.fullName);
      const actualFullName = normalizeComparableText(player.fullName);
      const expectedFullNameTokens = toComparableNameTokens(rosterPlayer.fullName);
      const actualFullNameTokens = toComparableNameTokens(player.fullName);
      const expectedShortName = normalizeComparableText(rosterPlayer.shortName);
      const actualShortName = normalizeComparableText(player.shortName);

      const fullNameMismatch =
        expectedFullName &&
        actualFullName &&
        expectedFullName !== actualFullName &&
        expectedFullNameTokens !== actualFullNameTokens;

      if (fullNameMismatch || (expectedShortName && actualShortName && expectedShortName !== actualShortName)) {
        return {
          id: player.id,
          shortName: rosterPlayer.shortName,
          fullName: rosterPlayer.fullName,
          fields: {}
        };
      }

      return player;
    });
  }
}
