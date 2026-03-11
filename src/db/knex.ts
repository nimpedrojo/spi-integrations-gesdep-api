import knex, { Knex } from 'knex';
import { config } from '../shared/config.js';

const knexConfig: Knex.Config = {
  client: 'mysql2',
  connection: {
    host: config.DATABASE_HOST,
    port: config.DATABASE_PORT,
    user: config.DATABASE_USER,
    password: config.DATABASE_PASSWORD,
    database: config.DATABASE_NAME
  },
  pool: { min: 2, max: 10 },
  migrations: { tableName: 'knex_migrations' }
};

export const db = knex(knexConfig);
export type Db = typeof db;
