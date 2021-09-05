export interface IMigrationService {
    setup(): Promise<void>;
    clear(): Promise<void>;
    executeChange(migrationPath: string): Promise<void>;
    executeRollback(migrationPath: string): Promise<void>;
}
