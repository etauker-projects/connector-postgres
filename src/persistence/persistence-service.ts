import pg from 'pg';
const { Pool } = pg;

import { IPersistenceClient } from './persistence-client.interface';
import { IPersistenceConfiguration } from './persistence-configuration.interface';
import { IPersistenceResult } from './persistence-results.interface';
import { IQueryConfig } from './query-configuration.interface';

export class PersistenceService {

    private pool: pg.Pool;
    private config: IQueryConfig = {
        commit: true,
        maxStatements: 1,
    };

    constructor(config: IPersistenceConfiguration) {
        if (!config.database) {
            throw new Error('Database not set');
        }
        if (!config.user) {
            throw new Error('Database user not set');
        }
        if (!config.password) {
            throw new Error('Database password not set');
        }
        if (!config.host) {
            throw new Error('Database host not set');
        }
        if (!config.port) {
            throw new Error('Database port not set');
        }
        this.pool = new Pool(config);
    }

    //------------------------------
    // Public methods
    //------------------------------

    /**
     * Start a database transaction and return the client object.
     */
    public start(): Promise<IPersistenceClient> {
        let client: IPersistenceClient;
        return this.pool.connect()
            .then(c => client = c)
            .then(() => client.query('BEGIN'))
            .then(() => client)
        ;
    }

    /**
     * Executes an SQL statement using the provided client.
     * Does not close the connection to allow multiple database queries in a single transaction.
     * Ensure to call 'end' method after all SQL statements are completed.
     */
    public continue<T>(client: IPersistenceClient, sql: string, params: any[] = []): Promise<IPersistenceResult<T>> {
        return client
            .query<T>(sql, params)
            .then(response => {
                if (Array.isArray(response)) {
                    return response.reduce((aggregate, item) => {
                        const mapped = PersistenceService.mapResults<T>(item);
                        return {
                            inserted: aggregate.inserted + mapped.inserted,
                            updated: aggregate.updated + mapped.updated,
                            deleted: aggregate.deleted + mapped.deleted,
                            results: [...aggregate.results, ...mapped.results],
                        }
                    }, PersistenceService.getDefaultResult<T>());
                }
                return PersistenceService.mapResults<T>(response);
            })
        ;
    }

    /**
     * Close a database connection for the provided client.
     * If 'commit' parameter is true, commits the transactions, 
     * otherwise rolls back all statements in this transaction.
     */
    public end(client: IPersistenceClient, commit: boolean): Promise<void> {
        const command = commit ? 'COMMIT' : 'ROLLBACK';
        return new Promise((resolve, reject) => {
            client.query(command).catch(error => reject(error)).finally(() => {
                client.release();
                resolve();
            });
        })
    }

    /**
     * Execute a 'SELECT' statement and return the list of results.
     */
     public query<T>(sql: string, params: any[] = [], partialConfig?: Partial<IQueryConfig>): Promise<T[]> {
        const config: IQueryConfig = { ...this.config, ...partialConfig };
        const allowed = ['SELECT'];
        const statements = this.splitStatements(sql);

        if (statements.length > config.maxStatements) {
            throw new Error(`SQL query count exceeds allowed count. ${statements.length} queries provided, maximum allowed is ${config.maxStatements}`);
        } else if (!this.allStatementsContainAnyKeyword(statements, allowed)) {
            throw new Error(`Query method can only be used for '${allowed.join("', '")}' statements`);
        }

        let client: IPersistenceClient;
        return this.start()
            .then(c => client = c)
            .then(() => this.continue<T>(client, sql, params))
            .then(result => result.results)
            .finally(() => this.end(client, false))
        ;
    }

    /**
     * Execute 'INSERT', 'UPDATE' or 'DELETE' statement and return the number of affected rows.
     */
    public execute(sql: string, params: any[] = [], partialConfig?: Partial<IQueryConfig>): Promise<number> {
        const config: IQueryConfig = { ...this.config, ...partialConfig };
        const allowed = ['INSERT', 'UPDATE', 'DELETE'];
        const statements = this.splitStatements(sql);

        if (statements.length > config.maxStatements) {
            throw new Error(`SQL statement count exceeds allowed count. ${statements.length} statements provided, maximum allowed is ${config.maxStatements}`);
        } else if (!this.allStatementsContainAnyKeyword(statements, allowed)) {
            throw new Error(`Execute method can only be used for '${allowed.join("', '")}' statements`);
        }

        let client: IPersistenceClient;
        return this.start()
            .then(c => client = c)
            .then(() => this.continue(client, sql, params))
            .then(result => result.inserted || result.updated || result.deleted)
            .finally(() => this.end(client, config.commit))
        ;
    }

    /**
     * Execute any kind of database statements and return the number of statement executed.
     */
    public any(sql: string, params: any[] = [], partialConfig?: Partial<IQueryConfig>): Promise<number> {
        const config: IQueryConfig = { ...this.config, ...partialConfig };
        const count = this.getStatementCount(sql);

        if (count > config.maxStatements) {
            throw new Error(`Database statement count exceeds allowed count. ${count} statements provided, maximum allowed is ${config.maxStatements}`);
        }

        let client: IPersistenceClient;
        return this.start()
            .then(c => client = c)
            .then(() => this.continue(client, sql, params))
            .then(() => count)
            .finally(() => this.end(client, config.commit))
        ;
    }

    private static mapResults<T>(input: pg.QueryResult<T>): IPersistenceResult<T> {
        const dataDefinitionCommand = [ 'CALL', 'DROP', 'CREATE', 'ALTER' ];
        const dataDefinition = [ 'INSERT', 'UPDATE', 'DELETE', 'SELECT' ];

        if (dataDefinition.includes(input.command)) {
            return this.mapDataResult(input);
        } else if (dataDefinitionCommand.includes(input.command)) {
            return this.getDefaultResult();
        } else {
            console.warn(`Command '${input.command}' not fully supported`);
            return this.getDefaultResult();
        }
    }

    private static mapDataResult<T>(input: pg.QueryResult<T>): IPersistenceResult<T> {
        return {
            inserted: input.command === 'INSERT' ? input.rowCount : 0,
            updated: input.command === 'UPDATE' ? input.rowCount : 0,
            deleted: input.command === 'DELETE' ? input.rowCount : 0,
            results: input.command === 'SELECT' && input.rows || [],
        }
    }

    private static getDefaultResult<T>(): IPersistenceResult<T> {
        return {
            inserted: 0,
            updated: 0,
            deleted: 0,
            results: [],
        }
    }

    private splitStatements(sql: string): string[] {
        return sql.split(';').filter(part => part.trim());
    }

    private getStatementCount(sql: string): number {
        return this.splitStatements(sql).length;
    }

    private allStatementsContainAnyKeyword(statements: string[], keywords: string[]): boolean {
        statements.forEach(statement => {
            statements.forEach(keyword => {
                if (!statement.toUpperCase().includes(keyword.toUpperCase())) {
                    return false;
                }
            })
        })
        return true;
    }
}
