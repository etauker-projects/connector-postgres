import pg, { QueryResult } from 'pg';
import { IPoolClient } from '../../postgres/model/postgres-pool-client.interface';
import { IPersistenceResult } from '../model/persistence-results.interface';

export class PersistenceTransaction {

    private client: IPoolClient;
    private open: boolean;
    private complete: boolean;
    private stack: Promise<any>;

    /**
     * Create a new database transaction.
     */
    constructor(promise: Promise<IPoolClient>) {
        this.client = undefined as any;
        this.open = false;
        this.complete = false;
        this.stack = promise
            .then(client => {
                this.client = client;
                return this.client.query('BEGIN');
            })
            .then(() => this.open = true)
            .catch(error => {
                console.error(error);
                this.open = false;
            });
    }

    /**
     * Waits until all queued statements are completed and returns true if the transaction is not closed.
     */
    public isOpen (): Promise<boolean> {
        return this.stack.then(() => this.open);
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
                    return response.reduce(this.addQueryResult.bind(this), this.getDefaultResult<T>());
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

        if (this.complete) {
            const error = new Error(`Cannot ${command} database transaction, transaction already completed`);
            return Promise.reject(error);
        }

        return this.ready().then(() => {
            let error: any;
            return this.client
                .query(command)
                .catch(e => error = e)
                .finally(() => {
                    this.client.release();
                    this.complete = true;
                    this.open = false;
                    return error ? Promise.reject(error) : Promise.resolve();
                })
            ;
        })
    }

    /**
     * Check for inconsistent state done automatically before each database transaction.
     */
    public ready(): Promise<void> {
        return this.stack.then(() => {
            if (this.complete) {
                throw new Error('Database transaction already completed');
            }
            if (!this.open) {
                throw new Error('Database connection not open');
            }
            if (!this.client) {
                throw new Error('Unexpected database error occurred: transaction is ready but client is not set');
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

    private addQueryResult<T>(aggregate: IPersistenceResult<T>, item: QueryResult<T>): IPersistenceResult<T> {
        const mapped = this.mapResults<T>(item);
        return this.mergeResults(aggregate, mapped);
    }

    private mergeResults<T>(aggregate: IPersistenceResult<T>, item: IPersistenceResult<T>): IPersistenceResult<T> {
        return {
            inserted: aggregate.inserted + item.inserted,
            updated: aggregate.updated + item.updated,
            deleted: aggregate.deleted + item.deleted,
            results: [...aggregate.results, ...item.results],
        }
    }
}

