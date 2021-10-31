import pg from 'pg';
const { Pool } = pg;

import { IPersistenceConfiguration } from './persistence-configuration.interface';
import { PersistenceTransaction } from './persistence-transaction';
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
        const config: IQueryConfig = { ...this.config, ...partialConfig };
        const allowed = ['SELECT'];
        const statements = this.splitStatements(sql);

        if (statements.length > config.maxStatements) {
            throw new Error(`SQL query count exceeds allowed count. ${statements.length} queries provided, maximum allowed is ${config.maxStatements}`);
        } else if (!this.allStatementsContainAnyKeyword(statements, allowed)) {
            throw new Error(`Query method can only be used for '${allowed.join("', '")}' statements`);
        }

        return new Promise(async (resolve, reject) => {
            const transaction = this.transact();
            try {
                const result = await transaction.continue<T>(sql, params);
                await transaction.end(false);
                resolve(result.results);
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
        const config: IQueryConfig = { ...this.config, ...partialConfig };
        const allowed = ['INSERT', 'UPDATE', 'DELETE'];
        const statements = this.splitStatements(sql);

        if (statements.length > config.maxStatements) {
            throw new Error(`SQL statement count exceeds allowed count. ${statements.length} statements provided, maximum allowed is ${config.maxStatements}`);
        } else if (!this.allStatementsContainAnyKeyword(statements, allowed)) {
            throw new Error(`Execute method can only be used for '${allowed.join("', '")}' statements`);
        }

        return new Promise(async (resolve, reject) => {
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
        const config: IQueryConfig = { ...this.config, ...partialConfig };
        const count = this.getStatementCount(sql);

        if (count > config.maxStatements) {
            throw new Error(`Database statement count exceeds allowed count. ${count} statements provided, maximum allowed is ${config.maxStatements}`);
        }

        return new Promise(async (resolve, reject) => {
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

    private splitStatements(sql: string): string[] {
        return sql.split(';').filter(part => part.trim());
    }

    private getStatementCount(sql: string): number {
        return this.splitStatements(sql).length;
    }

    private allStatementsContainAnyKeyword(statements: string[], keywords: string[]): boolean {
        statements.forEach(statement => {
            keywords.forEach(keyword => {
                if (!statement.toUpperCase().includes(keyword.toUpperCase())) {
                    return false;
                }
            })
        })
        return true;
    }
}
