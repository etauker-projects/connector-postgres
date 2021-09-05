export interface IPersistenceResult<T> {
    created: number;
    updated: number;
    deleted: number;
    results: T[];
};