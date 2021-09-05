export interface IPersistenceResult<T> {
    created: number;
    updated: number;
    deleted: number;
    inserted: number;
    results: T[];
};