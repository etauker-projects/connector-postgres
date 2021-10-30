import pg from 'pg';
import { IPersistenceClient } from './persistence-client.interface';
import { IPersistenceResult } from './persistence-results.interface';

export class PersistenceTransaction {

    private client: IPersistenceClient;
    private open: boolean;
    private stack: Promise<any>;

    /**
     * Create a new database transaction.
     */
    constructor(promise: Promise<IPersistenceClient>) {
        this.client = undefined as any;
        this.open = false;
        this.stack = promise
            .then(client => {
                this.client = client;
                return client.query('BEGIN');
            })
            .then(() => this.open = true);
    }

    /**
     * Executes an SQL statement as part of the current transaction.
     * Does not close the connection to allow multiple database queries in a single transaction.
     * Ensure to call 'end' method after all SQL statements are completed.
     */
    public continue<T>(sql: string, params: any[] = []): Promise<IPersistenceResult<T>> {
        return this.ready()
            .then(() => this.client.query<T>(sql, params))
            .then(response => {
                if (Array.isArray(response)) {
                    return response.reduce((aggregate, item) => {
                        const mapped = this.mapResults<T>(item);
                        return {
                            inserted: aggregate.inserted + mapped.inserted,
                            updated: aggregate.updated + mapped.updated,
                            deleted: aggregate.deleted + mapped.deleted,
                            results: [...aggregate.results, ...mapped.results],
                        }
                    }, this.getDefaultResult<T>());
                }
                return this.mapResults<T>(response);
            })
        ;
    }

    /**
     * Commit the transaction and close the database connection.
     */
    public commit(): Promise<void> {
        return this.end(true);
    }

    /**
     * Rollback the transaction and close the database connection.
     */
    public rollback(): Promise<void> {
        return this.end(false);
    }

    /**
     * Complete the transaction and close the database connection.
     * If 'commit' parameter is true, commits the transactions, 
     * otherwise rolls back all statements in this transaction.
     */
     public end(commit: boolean): Promise<void> {
        const command = commit ? 'COMMIT' : 'ROLLBACK';

        if (!this.open) {
            return Promise.reject(`Cannot ${command} database transaction, transaction already completed`);
        }

        return this.ready().then(() => {
            let error: any;
            return this.client
                .query(command)
                .catch(e => error = e)
                .finally(() => {
                    this.client.release();
                    return error ? Promise.reject(error) : Promise.resolve();
                })
            ;
        })
    }

    /**
     * Additional check for inconsistent state
     */
    private ready(): Promise<any> {
        return this.stack.then(() => {
            if (!this.client) {
                throw new Error('Unexpected database error occurred: transaction is ready but client is not set');
            }
            if (!this.open) {
                throw new Error('Database transaction already completed');
            }
            return;
        })
    }

    private mapResults<T>(input: pg.QueryResult<T>): IPersistenceResult<T> {
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

    private mapDataResult<T>(input: pg.QueryResult<T>): IPersistenceResult<T> {
        return {
            inserted: input.command === 'INSERT' ? input.rowCount : 0,
            updated: input.command === 'UPDATE' ? input.rowCount : 0,
            deleted: input.command === 'DELETE' ? input.rowCount : 0,
            results: input.command === 'SELECT' && input.rows || [],
        }
    }

    private getDefaultResult<T>(): IPersistenceResult<T> {
        return {
            inserted: 0,
            updated: 0,
            deleted: 0,
            results: [],
        }
    }
}
