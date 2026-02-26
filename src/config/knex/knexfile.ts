import type { Knex } from 'knex';
import { env } from '#config/env/env.js';

type EnvName = 'development' | 'production';
const NODE_ENV = (env.NODE_ENV ?? 'development') as EnvName;

const connectionConfig = {
  host: env.DB_HOST,
  port: parseInt(env.DB_PORT, 10),
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
};

const knegConfigs: Record<EnvName, Knex.Config> = {
  development: {
    client: 'postgresql',
    connection: connectionConfig,
    pool: { min: 2, max: 10 },
    migrations: {
      // Относительно корня проекта при запуске через tsx
      directory: './src/postgres/migrations',
      tableName: 'knex_migrations',
      extension: 'ts',
      loadExtensions: ['.ts', '.js'],
    },
  },
  production: {
    client: 'postgresql',
    connection: connectionConfig,
    pool: { min: 2, max: 10 },
    migrations: {
      // knexfile.js: /app/dist/config/knex/knexfile.js
      // migrations:  /app/dist/postgres/migrations/
      // ../../ = выйти из config/knex в dist, затем postgres/migrations
      directory: '../../postgres/migrations',
      tableName: 'knex_migrations',
      extension: 'js',
      loadExtensions: ['.js'],
    },
  },
};

export default knegConfigs[NODE_ENV];