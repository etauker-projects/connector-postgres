import { IPool } from '../postgres/postgres-pool.interface';
import { IQueryConfig } from './query-configuration.interface';
import { PersistenceTransaction } from './persistence-transaction';

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
        return new Promise(async (resolve, reject) => {

            const config: IQueryConfig = { ...this.config, ...partialConfig };
            const allowed = [ 'INSERT' ];
            const statements = this.splitStatements(sql);

            if (statements.length > config.maxStatements) {
                reject(new Error(`SQL statement count exceeds allowed count. ${statements.length} statements provided, maximum allowed is ${config.maxStatements}`));
            } else if (!this.allStatementsContainAnyKeyword(statements, allowed)) {
                reject(new Error(`Insert method can only be used for '${allowed.join("', '")}' statements`));
            }

            const transaction = this.transact();
            try {
                const result = await transaction.continue(sql, params);
                await transaction.end(config.commit);
                // TODO: append 'RETURNING *' to the query and return the inserted items
                resolve(result.inserted);
            } catch (error) {
                await transaction.end(false);
                reject(error);
            }
        })
    }

    /**
     * Execute a 'SELECT' statement and return the list of results.
     */
    public select<T>(sql: string, params: any[] = []): Promise<T[]> {
        return new Promise(async (resolve, reject) => {

            const allowed = [ 'SELECT' ];
            const statements = this.splitStatements(sql);

            if (statements.length > 1) {
                reject(new Error(`SQL statement count exceeds allowed count. ${statements.length} statements provided, maximum allowed is ${this.config.maxStatements}`));
            } else if (!this.allStatementsContainAnyKeyword(statements, allowed)) {
                reject(new Error(`Select method can only be used for '${allowed.join("', '")}' statements`));
            } else {

                // TODO: clean this up
                const transaction = this.transact();
                try {
                    transaction.continue<T>(statements[0], params)
                    .then(async results => {
                        await transaction.end(false);
                        resolve(results.results);
                    })
                    .catch(async error => {
                        await transaction.end(false);
                        reject(error);
                    })
                } catch (error) {
                    await transaction.end(false);
                    reject(error);
                }
            }

        })
    }


    /**
     * Execute 'UPDATE' statement and return the number of updated rows.
     */
    public update(sql: string, params: any[] = [], partialConfig?: Partial<IQueryConfig>): Promise<number> {
        return new Promise(async (resolve, reject) => {

            const config: IQueryConfig = { ...this.config, ...partialConfig };
            const allowed = [ 'UPDATE' ];
            const statements = this.splitStatements(sql);

            if (statements.length > config.maxStatements) {
                reject(new Error(`SQL statement count exceeds allowed count. ${statements.length} statements provided, maximum allowed is ${config.maxStatements}`));
            } else if (!this.allStatementsContainAnyKeyword(statements, allowed)) {
                reject(new Error(`Update method can only be used for '${allowed.join("', '")}' statements`));
            } else {
                const transaction = this.transact();
                try {
                    const result = await transaction.continue(sql, params);
                    await transaction.end(config.commit);
                    // TODO: append 'RETURNING *' to the query and return the updated items
                    resolve(result.updated);
                } catch (error) {
                    await transaction.end(false);
                    reject(error);
                }
            }

        })
    }


    /**
     * Execute 'DELETE' statement and return the number of deleted rows.
     */
    public delete(sql: string, params: any[] = [], partialConfig?: Partial<IQueryConfig>): Promise<number> {
        return new Promise(async (resolve, reject) => {

            const config: IQueryConfig = { ...this.config, ...partialConfig };
            const allowed = [ 'DELETE' ];
            const statements = this.splitStatements(sql);

            if (statements.length > config.maxStatements) {
                reject(new Error(`SQL statement count exceeds allowed count. ${statements.length} statements provided, maximum allowed is ${config.maxStatements}`));
            } else if (!this.allStatementsContainAnyKeyword(statements, allowed)) {
                reject(new Error(`Delete method can only be used for '${allowed.join("', '")}' statements`));
            } else {
                const transaction = this.transact();
                try {
                    const result = await transaction.continue(sql, params);
                    await transaction.end(config.commit);
                    // TODO: append 'RETURNING *' to the query and return the deleted items
                    resolve(result.deleted);
                } catch (error) {
                    await transaction.end(false);
                    reject(error);
                }
            }

        })
    }


    private splitStatements(sql: string): string[] {
        return sql.split(';').filter(part => part.trim());
    }

    private allStatementsContainAnyKeyword(statements: string[], keywords: string[]): boolean {
        return statements.every(statement => {
            return keywords.some(keyword => {
                if (!statement.toUpperCase().includes(keyword.toUpperCase())) {
                    return false;
                }
                return true;
            })
        })
    }
}
