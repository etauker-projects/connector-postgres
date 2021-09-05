import { IPersistenceClient } from './persistence-client.interface';
import { IPersistenceResult } from './persistence-results.interface';

export interface IPersistenceService {

    /**
     * Start a database transaction and return the client object.
     */
    startTransaction(): Promise<IPersistenceClient>;

    /**
     * Executes an SQL statement using the provided client.
     * Does not close the connection to allow multiple database queries in a single transaction.
     * Ensure to call endTransaction must be called after all SQL statements are completed.
     */
    continueTransaction<T>(client: IPersistenceClient, sql: string, params?: any[]): Promise<IPersistenceResult<T>>;

    /**
     * Close a database connection for the provided client.
     * If 'commit' parameter is true, commits the transactions, 
     * otherwise rolls back all statements in this transaction.
     */
    endTransaction(client: IPersistenceClient, commit: boolean): Promise<void>;

    /**
     * Execute 'INSERT', 'SELECT', 'UPDATE' and 'DELETE' statements.
     */
    query<T>(sql: string, params?: any[]): Promise<IPersistenceResult<T>>;

    /**
     * Executes any any number of SQL statements and returns number of statements executed.
     */ 
    update(sql: string, params?: any[]): Promise<number>;
}
