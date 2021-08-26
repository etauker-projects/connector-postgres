import pg from 'pg';
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
            .then(response => this.mapQueryResultToPersistenceResult<T>(response))
            .finally(() => client.release())
        ;
    }

    public async update<T>(sql: string, params: any[] = []): Promise<IPersistenceResult<T>> {
        const client = await this.pool.connect();
        let results: IPersistenceResult<T>

        return client.query('BEGIN')
            .then(() => client.query<T>(sql, params))
            .then(response => this.mapQueryResultToPersistenceResult<T>(response))
            .then(res => results = res)
            .then(() => client.query('COMMIT'))
            .then(() => results)
            .catch(e => {
                client.query('ROLLBACK');
                throw e;
            })
            .finally(() => client.release())
        ;
    }

    public mapQueryResultToPersistenceResult<T>(input: pg.QueryResult<T>): IPersistenceResult<T> {
        return {
            created: input.command === 'CREATE' ? input.rowCount : 0,
            updated: input.command === 'UPDATE' ? input.rowCount : 0,
            deleted: input.command === 'DELETE' ? input.rowCount : 0,
            results: input.command === 'SELECT' && input.rows || [],
        }
    }
}
