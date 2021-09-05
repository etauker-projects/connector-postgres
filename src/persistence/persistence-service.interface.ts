import { IPersistenceClient } from './persistence-client.interface';
import { IPersistenceResult } from './persistence-results.interface';

export interface IPersistenceService {
    startTransaction(): Promise<IPersistenceClient>;
    stopTransaction(client: IPersistenceClient, commit: boolean): Promise<void>;
    transact<T>(client: IPersistenceClient, sql: string, params?: any[]): Promise<IPersistenceResult<T>>;

    query<T>(sql: string, params?: any[]): Promise<IPersistenceResult<T>>;

    // returns number of statements executed
    update(sql: string, params?: any[]): Promise<number>;

}
