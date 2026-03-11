import { z } from 'zod';

export interface HealthStatus {
  status: 'ok';
  timestamp: string;
}

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
  source: z.enum(['gesdep', 'mysql']),
  count: z.number().int().nonnegative()
});

export const listTeamsResponseSchema = z.object({
  items: z.array(basicTeamItemSchema),
  meta: z.object({
    source: z.enum(['gesdep', 'mysql']),
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
    source: z.enum(['gesdep', 'mysql'])
  })
});

export type TeamListItem = z.infer<typeof basicTeamItemSchema>;
export type TeamItem = z.infer<typeof extendedTeamItemSchema>;
export type ListTeamsResponse = z.infer<typeof listTeamsResponseSchema>;
export type ListTeamsExtendedResponse = z.infer<typeof listTeamsExtendedResponseSchema>;
export type TeamPlayer = z.infer<typeof teamPlayerSchema>;
export type PlayerDetail = z.infer<typeof playerDetailSchema>;
export type GetPlayerResponse = z.infer<typeof getPlayerResponseSchema>;
