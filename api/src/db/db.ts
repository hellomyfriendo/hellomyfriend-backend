import knex, {Knex} from 'knex';
const knexStringcase = require('knex-stringcase');
import {config} from '../config';

const knexConfig: Knex.Config = {
  client: 'pg',
  connection: {
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.username,
    password: config.database.password,
  },
};

const options = knexStringcase(knexConfig);

const db = knex(options);

export {db};
