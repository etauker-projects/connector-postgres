import { IMigration } from "./migration.interface";

export interface IMigrationService {
    setup(): Promise<void>;
    clear(): Promise<void>;

    executeChange(migration: IMigration): Promise<void>;
    executeSequentialChanges(migrations: IMigration[]): Promise<void>;
    loadAndExecuteChange(migrationPath: string): Promise<void>;
    loadAndExecuteChanges(migrationRootPath: string): Promise<void>;

    executeRollback(migration: IMigration): Promise<void>;
    executeSequentialRollbacks(migrations: IMigration[]): Promise<void>;
    loadAndExecuteRollback(migrationPath: string): Promise<void>;
    loadAndExecuteRollbacks(migrationRootPath: string): Promise<void>;
}
