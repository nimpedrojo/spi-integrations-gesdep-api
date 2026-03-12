import { Knex } from 'knex';
import { TeamWorkExerciseStat, TeamWorkMethodStat, TeamWorkStatsResponse, teamWorkStatsResponseSchema } from '../../domain/types.js';
import { db } from '../knex.js';

type DailySyncRow = {
  team_id: string;
  work_date: string;
};

type MethodAggregationRow = {
  method_name: string;
  minutes: string | number;
};

type ExerciseAggregationRow = {
  exercise_id: string | null;
  title: string;
  image_url: string | null;
  minutes: string | number;
};

export class TeamWorkStatsRepository {
  constructor(private readonly knex: Knex = db) {}

  async findTeamName(teamId: string): Promise<string | null> {
    const team = await this.knex('teams').select('name').where({ id: teamId }).first();
    return team?.name ?? null;
  }

  async hasFullCoverage(teamId: string, from: string, to: string): Promise<boolean> {
    const rows = await this.knex<DailySyncRow>('team_work_daily_sync')
      .select('work_date')
      .where('team_id', teamId)
      .whereBetween('work_date', [from, to]);

    const coveredDays = new Set(rows.map((row) => row.work_date));
    return this.eachDate(from, to).every((date) => coveredDays.has(date));
  }

  async getAggregated(teamId: string, from: string, to: string): Promise<TeamWorkStatsResponse | null> {
    const team = await this.knex('teams').select('name').where({ id: teamId }).first();
    if (!team) {
      return null;
    }

    const methodsRows = await this.knex<MethodAggregationRow>('team_work_method_daily')
      .select('method_name')
      .sum({ minutes: 'minutes' })
      .where('team_id', teamId)
      .whereBetween('work_date', [from, to])
      .groupBy('method_name')
      .orderBy([{ column: 'minutes', order: 'desc' }, { column: 'method_name', order: 'asc' }]);

    const topExerciseRows = await this.knex<ExerciseAggregationRow>('team_work_exercise_daily')
      .select('exercise_id', 'title', 'image_url')
      .sum({ minutes: 'minutes' })
      .where('team_id', teamId)
      .whereBetween('work_date', [from, to])
      .groupBy('exercise_id', 'title', 'image_url')
      .orderBy([{ column: 'minutes', order: 'desc' }, { column: 'title', order: 'asc' }])
      .limit(20);

    const methods: TeamWorkMethodStat[] = methodsRows.map((row) => ({
      method: row.method_name,
      minutes: Number(row.minutes)
    }));

    const topExercises: TeamWorkExerciseStat[] = topExerciseRows.map((row, index) => ({
      rank: index + 1,
      exerciseId: row.exercise_id,
      title: row.title,
      minutes: Number(row.minutes),
      imageUrl: row.image_url
    }));

    return teamWorkStatsResponseSchema.parse({
      item: {
        teamId,
        teamName: team.name ?? null,
        from,
        to,
        methods,
        topExercises
      },
      meta: {
        source: 'mysql'
      }
    });
  }

  async replaceDaily(
    teamId: string,
    workDate: string,
    methods: TeamWorkMethodStat[],
    topExercises: TeamWorkExerciseStat[],
    syncedAt: Date
  ): Promise<void> {
    await this.knex.transaction(async (trx) => {
      await trx('team_work_method_daily').where({ team_id: teamId, work_date: workDate }).del();
      await trx('team_work_exercise_daily').where({ team_id: teamId, work_date: workDate }).del();

      if (methods.length > 0) {
        await trx('team_work_method_daily').insert(
          methods.map((method) => ({
            team_id: teamId,
            work_date: workDate,
            method_name: method.method,
            minutes: method.minutes,
            synced_at: syncedAt
          }))
        );
      }

      if (topExercises.length > 0) {
        await trx('team_work_exercise_daily').insert(
          topExercises.map((exercise) => ({
            team_id: teamId,
            work_date: workDate,
            exercise_id: exercise.exerciseId,
            title: exercise.title,
            minutes: exercise.minutes,
            image_url: exercise.imageUrl,
            synced_at: syncedAt
          }))
        );
      }

      await trx('team_work_daily_sync')
        .insert({
          team_id: teamId,
          work_date: workDate,
          synced_at: syncedAt
        })
        .onConflict(['team_id', 'work_date'])
        .merge({
          synced_at: syncedAt
        });
    });
  }

  private eachDate(from: string, to: string) {
    const result: string[] = [];
    const cursor = new Date(`${from}T00:00:00Z`);
    const end = new Date(`${to}T00:00:00Z`);

    while (cursor <= end) {
      result.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return result;
  }
}
