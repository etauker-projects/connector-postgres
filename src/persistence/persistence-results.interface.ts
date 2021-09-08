export interface IPersistenceResult<T> {
    inserted: number;
    updated: number;
    deleted: number;
    results: T[];
};