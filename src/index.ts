// const runner = require('./migration-runner');
// import * as path from 'path';
// import * as Pool from 'pg-pool';
// import * as url from 'url';
import { MigrationRunner } from './migration-runner';
// const runner = require('./migration-runner');

// const params = url.parse(process.env.DATABASE_URL);
// const auth = params.auth.split(':');

const config = {
  database: 'local_01',
  user: 'local_01_admin',
  password: 'admin',
  host: 'localhost',
  port: 5432,
  ssl: false,
  max: 5,
  idleTimeoutMillis: 1000, // close idle clients after 1 second
  connectionTimeoutMillis: 1000, // return an error after 1 second if connection could not be established
  maxUses: 7500, // close (and replace) a connection after it has been used 7500 times (see below for discussion)
};

// const pool = new Pool.default(config);
// const selectOneSql = 'SELECT 1 AS count';
// const createTableSql = 'CREATE TABLE IF NOT EXISTS security.migration_test(test varchar(255))';

// pool.connect().then((client) => {
//   client.query(createTableSql).then(res => {
//     // console.log('Count is ', res.rows[0].count)
//     client.release()
//   })
//   .catch(e => {
//     console.error(e);
    
//     client.release()
//     console.error('query error', e.message, e.stack)
//   })
// })

// const migrationsDir = '../migrations/internal';
// const changeFilepath = path.resolve(migrationsDir, '01.create-types/change.sql');
// const rollbackFilepath = path.resolve(migrationsDir, '01.create-types/rollback.sql');

const createTypes = `
CREATE TYPE action_type AS ENUM ('CHANGE', 'ROLLBACK');
CREATE TYPE migration_status AS ENUM ('QUEUED', 'SUCCESS', 'FAILURE', 'IGNORED');
CREATE TYPE failure_action AS ENUM ('SKIP', 'ROLLBACK', 'FAIL');

`;

const createTables = `
CREATE TABLE IF NOT EXISTS migration (
  id                uuid            PRIMARY KEY,
  name              varchar(255)    UNIQUE NOT NULL,
  execution_order   int             ,
  on_failure        failure_action  NOT NULL DEFAULT 'FAIL'
);

CREATE TABLE IF NOT EXISTS change (
  migration_id    uuid                ,
  hash            varchar(255)        ,
  status          migration_status    NOT NULL DEFAULT 'QUEUED',
  script          text                NOT NULL,
  created_at      timestamp without time zone    NOT NULL DEFAULT now(), 
  executed_at     timestamp without time zone    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rollback (
  migration_id    uuid                ,
  hash            varchar(255)        ,
  status          migration_status    NOT NULL DEFAULT 'IGNORED',
  script          text                NOT NULL,
  created_at      timestamp without time zone    NOT NULL DEFAULT now(), 
  executed_at     timestamp without time zone    NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS history (
  action_id       uuid                            ,
  action_type     action_type                     NOT NULL, 
  date_time       timestamp without time zone      NOT NULL DEFAULT now()
);
`;

const dropTypes = `
DROP TYPE IF EXISTS failure_action;
DROP TYPE IF EXISTS migration_status;
DROP TYPE IF EXISTS action_type;
`;

const dropTables = `
DROP TABLE IF EXISTS history;
DROP TABLE IF EXISTS rollback;
DROP TABLE IF EXISTS change;
DROP TABLE IF EXISTS migration;
`;

// create migration tables
// MigrationRunner.executeChange(config, createTypes);
// MigrationRunner.executeChange(config, createTables);

// MigrationRunner.executeRollback(config, dropTables);
MigrationRunner.executeRollback(config, dropTypes);


// insert migration rows
// run migrations
// if fails - rollback
// 
