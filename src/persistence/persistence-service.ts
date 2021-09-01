import pg from 'pg';
import { IPersistenceClient } from './persistence-client.interface';
const { Pool } = pg;

import { IPersistenceConfiguration } from './persistence-configuration.interface';
import { IPersistenceResult } from './persistence-results.interface';
import { IPersistenceService } from './persistence-service.interface';


export class PersistenceService implements IPersistenceService {

    private pool: pg.Pool;

    constructor(config: IPersistenceConfiguration) {
        this.pool = new Pool(config);
    }

    public async query<T>(sql: string, params: any[] = []): Promise<IPersistenceResult<T>> {
        const client = await this.pool.connect();
        return client.query<T>(sql, params)
            .then(response => this.mapQueryResultToPersistenceQueryResult<T>(response))
            .finally(() => client.release())
        ;
    }

    public startTransaction(): Promise<IPersistenceClient> {
        let client: IPersistenceClient;
        return this.pool.connect()
            .then(c => client = c)
            .then(() => client.query('BEGIN'))
            .then(() => client)
        ;
    }

    public stopTransaction(client: IPersistenceClient, commit: boolean): Promise<void> {
        const command = commit ? 'COMMIT' : 'ROLLBACK';
        return new Promise((resolve, reject) => {
            client.query(command).finally(() => {
                client.release();
                resolve();
            });
        })
    }

    public async update<T>(sql: string, params?: any[]): Promise<any> {
        let client: IPersistenceClient;
        let count: number;

        return this.startTransaction()
            .then(poolClient => client = poolClient)
            .then(() => client.query(sql, params))
            .then((res: any) => count = res.length)
            .then(() => this.stopTransaction(client, true))
            .then(() => count)
            .catch(e => {
                return this.stopTransaction(client, false).then(() => {
                    throw e;
                });
            })
        ;
    }

    public mapQueryResultToPersistenceQueryResult<T>(input: pg.QueryResult<T>): IPersistenceResult<T> {
        return {
            created: input.command === 'CREATE' ? input.rowCount : 0,
            updated: input.command === 'UPDATE' ? input.rowCount : 0,
            deleted: input.command === 'DELETE' ? input.rowCount : 0,
            results: input.command === 'SELECT' && input.rows || [],
        }
    }
}
