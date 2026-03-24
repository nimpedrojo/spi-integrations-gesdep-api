import { db } from './knex.js';

export const ensureDatabaseSchema = async () => {
  const hasTeams = await db.schema.hasTable('teams');
  if (!hasTeams) {
    await db.schema.createTable('teams', (table) => {
      table.string('id', 64).primary();
      table.string('name', 255).notNullable();
      table.string('category', 255).nullable();
      table.string('season', 64).nullable();
      table.string('status', 64).nullable();
      table.timestamp('synced_at').notNullable();
      table.timestamps(true, true);
    });
  }

  const hasPlayers = await db.schema.hasTable('players');
  if (!hasPlayers) {
    await db.schema.createTable('players', (table) => {
      table.string('id', 64).primary();
      table.string('short_name', 255).nullable();
      table.string('full_name', 255).nullable();
      table.json('fields_json').notNullable();
      table.timestamp('synced_at').notNullable();
      table.timestamps(true, true);
    });
  }

  const hasTeamPlayers = await db.schema.hasTable('team_players');
  if (!hasTeamPlayers) {
    await db.schema.createTable('team_players', (table) => {
      table.string('team_id', 64).notNullable();
      table.string('player_id', 64).notNullable();
      table.integer('sort_order').notNullable().defaultTo(0);
      table.timestamp('synced_at').notNullable();
      table.primary(['team_id', 'player_id']);
      table.foreign('team_id').references('teams.id').onDelete('CASCADE');
      table.foreign('player_id').references('players.id').onDelete('CASCADE');
      table.index(['team_id', 'sort_order']);
    });
  }

  const hasSyncRuns = await db.schema.hasTable('sync_runs');
  if (!hasSyncRuns) {
    await db.schema.createTable('sync_runs', (table) => {
      table.increments('id').primary();
      table.string('job_name', 128).notNullable();
      table.string('status', 32).notNullable();
      table.timestamp('started_at').notNullable();
      table.timestamp('finished_at').nullable();
      table.json('details_json').nullable();
      table.timestamps(true, true);
    });
  }

  const hasTeamWorkDailySync = await db.schema.hasTable('team_work_daily_sync');
  if (!hasTeamWorkDailySync) {
    await db.schema.createTable('team_work_daily_sync', (table) => {
      table.string('team_id', 64).notNullable();
      table.date('work_date').notNullable();
      table.timestamp('synced_at').notNullable();
      table.primary(['team_id', 'work_date']);
      table.foreign('team_id').references('teams.id').onDelete('CASCADE');
      table.index(['work_date']);
    });
  }

  const hasTeamWorkMethodDaily = await db.schema.hasTable('team_work_method_daily');
  if (!hasTeamWorkMethodDaily) {
    await db.schema.createTable('team_work_method_daily', (table) => {
      table.string('team_id', 64).notNullable();
      table.date('work_date').notNullable();
      table.string('method_name', 255).notNullable();
      table.integer('minutes').notNullable().defaultTo(0);
      table.timestamp('synced_at').notNullable();
      table.primary(['team_id', 'work_date', 'method_name']);
      table.foreign('team_id').references('teams.id').onDelete('CASCADE');
      table.index(['team_id', 'work_date']);
    });
  }

  const hasTeamWorkExerciseDaily = await db.schema.hasTable('team_work_exercise_daily');
  if (!hasTeamWorkExerciseDaily) {
    await db.schema.createTable('team_work_exercise_daily', (table) => {
      table.string('team_id', 64).notNullable();
      table.date('work_date').notNullable();
      table.string('exercise_id', 64).nullable();
      table.string('title', 255).notNullable();
      table.integer('minutes').notNullable().defaultTo(0);
      table.string('image_url', 1024).nullable();
      table.timestamp('synced_at').notNullable();
      table.primary(['team_id', 'work_date', 'title']);
      table.foreign('team_id').references('teams.id').onDelete('CASCADE');
      table.index(['team_id', 'work_date']);
    });
  }

  const hasTeamMatchStatSnapshots = await db.schema.hasTable('team_match_stat_snapshots');
  if (!hasTeamMatchStatSnapshots) {
    await db.schema.createTable('team_match_stat_snapshots', (table) => {
      table.string('team_id', 64).notNullable();
      table.string('competition', 32).notNullable();
      table.string('result', 16).notNullable();
      table.string('team_name', 255).nullable();
      table.integer('total_played').notNullable().defaultTo(0);
      table.integer('total_won').notNullable().defaultTo(0);
      table.integer('total_drawn').notNullable().defaultTo(0);
      table.integer('total_lost').notNullable().defaultTo(0);
      table.integer('total_goals_for').notNullable().defaultTo(0);
      table.integer('total_goals_against').notNullable().defaultTo(0);
      table.integer('total_points').notNullable().defaultTo(0);
      table.integer('home_played').notNullable().defaultTo(0);
      table.integer('home_won').notNullable().defaultTo(0);
      table.integer('home_drawn').notNullable().defaultTo(0);
      table.integer('home_lost').notNullable().defaultTo(0);
      table.integer('home_goals_for').notNullable().defaultTo(0);
      table.integer('home_goals_against').notNullable().defaultTo(0);
      table.integer('home_points').notNullable().defaultTo(0);
      table.integer('away_played').notNullable().defaultTo(0);
      table.integer('away_won').notNullable().defaultTo(0);
      table.integer('away_drawn').notNullable().defaultTo(0);
      table.integer('away_lost').notNullable().defaultTo(0);
      table.integer('away_goals_for').notNullable().defaultTo(0);
      table.integer('away_goals_against').notNullable().defaultTo(0);
      table.integer('away_points').notNullable().defaultTo(0);
      table.timestamp('synced_at').notNullable();
      table.primary(['team_id', 'competition', 'result']);
      table.foreign('team_id').references('teams.id').onDelete('CASCADE');
      table.index(['team_id']);
    });
  }

  const hasTeamMatches = await db.schema.hasTable('team_matches');
  if (!hasTeamMatches) {
    await db.schema.createTable('team_matches', (table) => {
      table.string('team_id', 64).notNullable();
      table.string('match_id', 128).notNullable();
      table.string('team_name', 255).nullable();
      table.string('opponent_name', 255).notNullable();
      table.boolean('is_home').notNullable();
      table.integer('team_score').notNullable().defaultTo(0);
      table.integer('opponent_score').notNullable().defaultTo(0);
      table.string('result', 16).notNullable();
      table.string('competition', 32).notNullable();
      table.string('kickoff_at', 64).notNullable();
      table.string('venue', 255).nullable();
      table.timestamp('synced_at').notNullable();
      table.primary(['team_id', 'match_id']);
      table.foreign('team_id').references('teams.id').onDelete('CASCADE');
      table.index(['team_id', 'competition', 'result']);
    });
  }
};
