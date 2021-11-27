import { IPool } from '../postgres/postgres-pool.interface';
import { IQueryConfig } from './query-configuration.interface';
import { PersistenceTransaction } from './persistence-transaction';
import { IPersistenceResult } from './persistence-results.interface';

export class PersistenceService {

    private pool: IPool;
    private config: IQueryConfig = {
        maxStatements: 1,   // multiple statements in single method call not currently supported
        commit: true,
    };

    constructor(pool: IPool) {
        this.pool = pool;
    }

    //------------------------------
    // Public methods
    //------------------------------

    /**
     * Start a new database transaction.
     * Uses a connection from the pool assigned to the service instance.
     */
    public transact(): PersistenceTransaction {
        return new PersistenceTransaction(this.pool.connect());
    }


    /**
     * Execute 'INSERT' statement and return the number of inserted rows.
     */
    public insert(sql: string, params: any[] = [], partialConfig?: Partial<IQueryConfig>): Promise<number> {
        const config: IQueryConfig = { ...this.config, ...partialConfig };
        const statements = this.splitStatements(sql);
        // TODO: append 'RETURNING *' to the query and return the inserted items

        return Promise.resolve()
            .then(() => this.verifyStatementCount(config.maxStatements, statements.length))
            .then(() => this.verifyStatementMethod('Insert', 'INSERT', sql))
            .then(() => this.execute(sql, params, config.commit))
            .then(res => res.inserted)
        ;
    }

    /**
     * Execute a 'SELECT' statement and return the list of results.
     */
    public select<T>(sql: string, params: any[] = []): Promise<T[]> {
        const statements = this.splitStatements(sql);
        // TODO: append 'RETURNING *' to the query and return the inserted items

        return Promise.resolve()
            .then(() => this.verifyStatementCount(this.config.maxStatements, statements.length))
            .then(() => this.verifyStatementMethod('Select', 'SELECT', sql))
            .then(() => this.execute<T>(sql, params, false))
            .then(res => res.results)
        ;
    }


    /**
     * Execute 'UPDATE' statement and return the number of updated rows.
     */
    public update(sql: string, params: any[] = [], partialConfig?: Partial<IQueryConfig>): Promise<number> {
        const config: IQueryConfig = { ...this.config, ...partialConfig };
        const statements = this.splitStatements(sql);
        // TODO: append 'RETURNING *' to the query and return the inserted items

        return Promise.resolve()
            .then(() => this.verifyStatementCount(config.maxStatements, statements.length))
            .then(() => this.verifyStatementMethod('Update', 'UPDATE', sql))
            .then(() => this.execute(sql, params, config.commit))
            .then(res => res.updated)
        ;
    }


    /**
     * Execute 'DELETE' statement and return the number of deleted rows.
     */
    public delete(sql: string, params: any[] = [], partialConfig?: Partial<IQueryConfig>): Promise<number> {
        const config: IQueryConfig = { ...this.config, ...partialConfig };
        const statements = this.splitStatements(sql);
        // TODO: append 'RETURNING *' to the query and return the inserted items

        return Promise.resolve()
            .then(() => this.verifyStatementCount(config.maxStatements, statements.length))
            .then(() => this.verifyStatementMethod('Delete', 'DELETE', sql))
            .then(() => this.execute(sql, params, config.commit))
            .then(res => res.deleted)
        ;
    }


    private execute<T>(sql: string, params: any[] = [], commit: boolean): Promise<IPersistenceResult<T>> {
        return new Promise((resolve, reject) => {
            const transaction = this.transact();
            transaction.continue<T>(sql, params)
                .then(res => transaction.end(commit).then(() => resolve(res)))
                .catch(err => transaction.end(false).then(() => reject(err)))
                .catch(err => reject(err))
        })
    }

    private splitStatements(sql: string): string[] {
        return sql.split(';').filter(part => part.trim());
    }

    private verifyStatementCount(maximum: number, actual: number): Promise<void> {
        if (actual > maximum) {
            throw new Error(`SQL statement count exceeds allowed count. ${actual} statements provided, maximum allowed is ${maximum}`);
        }
        return Promise.resolve();
    }

    private verifyStatementMethod(method: string, keyword: string, sql: string): Promise<void> {
        if (!sql.toLowerCase().split(' ').includes(keyword.toLowerCase())) {
            throw new Error(`${method} method can only be used for '${keyword}' statements`);
        }
        return Promise.resolve();
    }
}
