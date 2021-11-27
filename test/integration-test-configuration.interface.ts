import { IMigrationConfiguration } from '../src/migration/migration-configuration.interface';
import { IPoolConfig } from '../src/postgres/postgres-pool-configuration.interface';

export interface IIntegrationTestConfiguration {
    databaseConfig: IPoolConfig;
    migrationConfig: IMigrationConfiguration;
}