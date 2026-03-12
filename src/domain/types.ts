import { z } from 'zod';

export interface HealthStatus {
  status: 'ok';
  timestamp: string;
}

const sourceSchema = z.enum(['gesdep', 'mysql']);

export const teamPlayerSchema = z.object({
  id: z.string(),
  shortName: z.string(),
  fullName: z.string()
});

export const basicTeamItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().nullable(),
  season: z.string().nullable(),
  status: z.string().nullable()
});

export const extendedTeamItemSchema = basicTeamItemSchema.extend({
  players: z.array(teamPlayerSchema)
});

const teamsMetaSchema = z.object({
  source: sourceSchema,
  count: z.number().int().nonnegative()
});

export const listTeamsResponseSchema = z.object({
  items: z.array(basicTeamItemSchema),
  meta: z.object({
    source: sourceSchema,
    count: z.number().int().nonnegative()
  })
});

export const listTeamsExtendedResponseSchema = z.object({
  items: z.array(extendedTeamItemSchema),
  meta: teamsMetaSchema
});

export const playerDetailSchema = z.object({
  id: z.string(),
  shortName: z.string().nullable(),
  fullName: z.string().nullable(),
  fields: z.record(z.string().nullable())
});

export const getPlayerResponseSchema = z.object({
  item: playerDetailSchema,
  meta: z.object({
    source: sourceSchema
  })
});

export const teamWorkMethodStatSchema = z.object({
  method: z.string(),
  minutes: z.number().int().nonnegative()
});

export const teamWorkExerciseStatSchema = z.object({
  rank: z.number().int().positive(),
  exerciseId: z.string().nullable(),
  title: z.string(),
  minutes: z.number().int().nonnegative(),
  imageUrl: z.string().nullable()
});

export const teamWorkStatsResponseSchema = z.object({
  item: z.object({
    teamId: z.string(),
    teamName: z.string().nullable(),
    from: z.string(),
    to: z.string(),
    methods: z.array(teamWorkMethodStatSchema),
    topExercises: z.array(teamWorkExerciseStatSchema)
  }),
  meta: z.object({
    source: sourceSchema
  })
});

export type TeamListItem = z.infer<typeof basicTeamItemSchema>;
export type TeamItem = z.infer<typeof extendedTeamItemSchema>;
export type ListTeamsResponse = z.infer<typeof listTeamsResponseSchema>;
export type ListTeamsExtendedResponse = z.infer<typeof listTeamsExtendedResponseSchema>;
export type TeamPlayer = z.infer<typeof teamPlayerSchema>;
export type PlayerDetail = z.infer<typeof playerDetailSchema>;
export type GetPlayerResponse = z.infer<typeof getPlayerResponseSchema>;
export type TeamWorkMethodStat = z.infer<typeof teamWorkMethodStatSchema>;
export type TeamWorkExerciseStat = z.infer<typeof teamWorkExerciseStatSchema>;
export type TeamWorkStatsResponse = z.infer<typeof teamWorkStatsResponseSchema>;
