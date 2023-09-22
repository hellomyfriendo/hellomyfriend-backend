import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

const env = dotenv.config();
dotenvExpand.expand(env);

import type {Knex} from 'knex';
import {config as appConfig} from './src/config';

const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: appConfig.database.host,
    port: appConfig.database.port,
    database: appConfig.database.name,
    user: appConfig.database.username,
    password: appConfig.database.password,
  },
};

module.exports = config;
