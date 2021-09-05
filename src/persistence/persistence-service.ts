import pg from 'pg';
const { Pool } = pg;

import { IPersistenceClient } from './persistence-client.interface';
import { IPersistenceConfiguration } from './persistence-configuration.interface';
import { IPersistenceResult } from './persistence-results.interface';
import { IPersistenceService } from './persistence-service.interface';


export class PersistenceService implements IPersistenceService {

    private pool: pg.Pool;

    constructor(config: IPersistenceConfiguration) {
        this.pool = new Pool(config);
    }

    //------------------------------
    // Public methods
    //------------------------------
    public startTransaction(): Promise<IPersistenceClient> {
        let client: IPersistenceClient;
        return this.pool.connect()
            .then(c => client = c)
            .then(() => client.query('BEGIN'))
            .then(() => client)
        ;
    }

    public continueTransaction<T>(
        client: IPersistenceClient,
        sql: string,
        params: any[] = []
    ): Promise<IPersistenceResult<T>> {
        return client
            .query<T>(sql, params)
            .then(response => {
                if (Array.isArray(response)) {
                    return response.reduce((aggregate, item) => {
                        const mapped = PersistenceService.mapResults<T>(item);
                        return {
                            created: aggregate.created + mapped.created,
                            updated: aggregate.updated + mapped.updated,
                            deleted: aggregate.deleted + mapped.deleted,
                            results: [...aggregate.results, ...mapped.results],
                        }
                    }, PersistenceService.getDefaultResult());
                }
                return PersistenceService.mapResults<T>(response);
            })
        ;
    }

    public endTransaction(client: IPersistenceClient, commit: boolean): Promise<void> {
        const command = commit ? 'COMMIT' : 'ROLLBACK';
        return new Promise((resolve, reject) => {
            client.query(command).finally(() => {
                client.release();
                resolve();
            });
        })
    }

    public query<T>(sql: string, params: any[] = []): Promise<IPersistenceResult<T>> {
        let client: IPersistenceClient;
        return this.startTransaction()
            .then(c => client = c)
            .then(() => this.continueTransaction<T>(client, sql, params))
            .finally(() => this.endTransaction(client, true))
        ;
    }

    public update<T>(sql: string, params?: any[]): Promise<any> {
        let client: IPersistenceClient;
        let count: number;

        return this.startTransaction()
            .then(poolClient => client = poolClient)
            .then(() => client.query(sql, params))
            .then(() => this.endTransaction(client, true))
            .then(() => count)
            .catch(e => {
                return this.endTransaction(client, false).then(() => {
                    throw e;
                });
            })
        ;
    }

    public static mapResults<T>(input: pg.QueryResult<T>): IPersistenceResult<T> {
        const dataDefinitionCommand = [ 'CALL', 'DROP', 'CREATE' ];
        const dataDefinition = [ 'INSERT', 'UPDATE', 'DELETE', 'SELECT' ];

        if (dataDefinition.includes(input.command)) {
            return this.mapDataResult(input);
        } else if (dataDefinitionCommand.includes(input.command)) {
            return this.getDefaultResult();
        } else {
            console.warn(`Command '${input.command}' not supported`);
            return this.getDefaultResult();
        }
    }

    private static mapDataResult<T>(input: pg.QueryResult<T>): IPersistenceResult<T> {
        return {
            created: input.command === 'INSERT' ? input.rowCount : 0,
            updated: input.command === 'UPDATE' ? input.rowCount : 0,
            deleted: input.command === 'DELETE' ? input.rowCount : 0,
            results: input.command === 'SELECT' && input.rows || [],
        }
    }

    private static getDefaultResult<T>(): IPersistenceResult<T> {
        return {
            created: 0,
            updated: 0,
            deleted: 0,
            results: [],
        }
    }
}
