export interface IMigrationService {
    setup(): Promise<boolean>;
    clear(): Promise<boolean>;
}
