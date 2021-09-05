export interface IMigrationService {
    setup(): Promise<boolean>;
    clear(): Promise<boolean>;
    executeMigrationFile(fullPath: string): Promise<number>;
}
