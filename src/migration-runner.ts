// const Pool = require('pg-pool');
// const Pool = require('pg-pool');
import pg from 'pg';
const { Pool, Client } = pg;
// import * as path from 'path';
// import * as url from 'url';


export class MigrationRunner {

    public static executeChange(config: any, changeScript: string) {
        console.log('executing change');
        // TODO: BEGIN
        return this.execute(config, changeScript);
        // TODO: COMMIT or ROLLBACK
    }

    public static executeRollback(config: any, rollbackScript: string) {
        console.log('executing rollback');
        // TODO: BEGIN
        return this.execute(config, rollbackScript);
        // TODO: COMMIT or ROLLBACK
    }

    private static execute(config: any, script: string) {
        const client = new Client(config);
        client.connect()
            .then(() => {
                client.query(script).then(res => {
                    console.log('Result ', res.rows)
                    return client.query('COMMIT')
            })
            .then(res => {
                client.end()
            })
            .catch(e => {
                client.query('ROLLBACK').finally(() => {
                    client.end()
                })
                console.error('query error', e.message, e.stack)
            })
        })
    }

    private static executePooled(config: any, script: string) {
        const pool = new Pool(config);
        pool.connect().then(client => {
          client.query(script).then(res => {
            console.log('Result ', res.rows)
            client.release()
          })
          .catch(e => {
            client.release()
            console.error('query error', e.message, e.stack)
          })
        })
    }
}
