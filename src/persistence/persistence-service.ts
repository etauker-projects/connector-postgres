import { IPool } from '../postgres/postgres-pool.interface';
import { IPersistenceResult } from './persistence-results.interface';
import { IQueryConfig } from './query-configuration.interface';
import { PersistenceTransaction } from './persistence-transaction';

export class PersistenceService {

    private pool: IPool;
    private config: IQueryConfig = {
        commit: true,
        maxStatements: 1,
    };

    constructor(pool: IPool) {
        this.pool = pool;
    }

    //------------------------------
    // Public methods
    //------------------------------

    /**
     * 
     */
     public transact(): PersistenceTransaction {
        return new PersistenceTransaction(this.pool.connect());
    }

    /**
     * Execute a 'SELECT' statement and return the list of results.
     * Does not commit the transaction.
     */
     public query<T>(sql: string, params: any[] = [], partialConfig?: Partial<Omit<IQueryConfig, 'commit'>>): Promise<T[]> {
        return new Promise(async (resolve, reject) => {

            const config: IQueryConfig = { ...this.config, ...partialConfig };
            const allowed = ['SELECT'];
            const statements = this.splitStatements(sql);

            if (statements.length > config.maxStatements) {
                reject(new Error(`SQL query count exceeds allowed count. ${statements.length} queries provided, maximum allowed is ${config.maxStatements}`));
            } else if (!this.allStatementsContainAnyKeyword(statements, allowed)) {
                reject(new Error(`Query method can only be used for '${allowed.join("', '")}' statements`));
            }

            // TODO: clean this up
            const transaction = this.transact();
            try {
                const results = statements.map(statement => transaction.continue<T>(statement, params))
                return Promise.all(results).then(results => {
                    return results.reduce((aggregate, res) => this.mergeResults(aggregate, res), this.getDefaultResult());
                }).then(async merged => {
                    await transaction.end(false);
                    resolve(merged.results);
                }).catch(async error => {
                    await transaction.end(false);
                    reject(error);
                })
            } catch (error) {
                await transaction.end(false);
                reject(error);
            }
        })
    }

    /**
     * Execute 'INSERT', 'UPDATE' or 'DELETE' statement and return the number of affected rows.
     */
    public execute(sql: string, params: any[] = [], partialConfig?: Partial<IQueryConfig>): Promise<number> {
        return new Promise(async (resolve, reject) => {

            const config: IQueryConfig = { ...this.config, ...partialConfig };
            const allowed = ['INSERT', 'UPDATE', 'DELETE'];
            const statements = this.splitStatements(sql);

            if (config.maxStatements > 1) {
                // TODO: find if there is a good use case for this or if it can be scrapped
                reject(new Error(`Executing multiple statements not implemented`));
            } else if (statements.length > config.maxStatements) {
                reject(new Error(`SQL statement count exceeds allowed count. ${statements.length} statements provided, maximum allowed is ${config.maxStatements}`));
            } else if (!this.allStatementsContainAnyKeyword(statements, allowed)) {
                reject(new Error(`Execute method can only be used for '${allowed.join("', '")}' statements`));
            }

            const transaction = this.transact();
            try {
                const result = await transaction.continue(sql, params);
                await transaction.end(config.commit);
                resolve(result.inserted || result.updated || result.deleted);
            } catch (error) {
                await transaction.end(false);
                reject(error);
            }
        })
    }

    /**
     * Execute any kind of database statements and return the number of statement executed.
     */
    public any(sql: string, params: any[] = [], partialConfig?: Partial<IQueryConfig>): Promise<number> {
        return new Promise(async (resolve, reject) => {

            const config: IQueryConfig = { ...this.config, ...partialConfig };
            const count = this.getStatementCount(sql);

            if (count > config.maxStatements) {
                reject(new Error(`Database statement count exceeds allowed count. ${count} statements provided, maximum allowed is ${config.maxStatements}`));
            }

            const transaction = this.transact();
            try {
                await transaction.continue(sql, params);
                await transaction.end(config.commit);
                resolve(count);
            } catch (error) {
                await transaction.end(false);
                reject(error);
            }
        })
    }


    private getDefaultResult<T>(): IPersistenceResult<T> {
        return {
            inserted: 0,
            updated: 0,
            deleted: 0,
            results: [],
        }
    }

    private mergeResults<T>(aggregate: IPersistenceResult<T>, item: IPersistenceResult<T>): IPersistenceResult<T> {
        return {
            inserted: aggregate.inserted + item.inserted,
            updated: aggregate.updated + item.updated,
            deleted: aggregate.deleted + item.deleted,
            results: [...aggregate.results, ...item.results],
        }
    }

    private splitStatements(sql: string): string[] {
        return sql.split(';').filter(part => part.trim());
    }

    private getStatementCount(sql: string): number {
        return this.splitStatements(sql).length;
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
