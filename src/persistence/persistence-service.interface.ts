import { IPersistenceResult } from './persistence-results.interface';

export interface IPersistenceService {
    query<T>(sql: string, params?: any[]): Promise<IPersistenceResult<T>>;

    // returns number of statements executed
    update(sql: string, params?: any[]): Promise<number>;
}
