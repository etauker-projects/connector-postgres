import { IPersistenceResult } from "./persistence-results.interface";

export interface IPersistenceService {
    query<T>(sql: string, params?: any[]): Promise<IPersistenceResult<T>>;
    update(sql: string, params?: any[]): any;
}
