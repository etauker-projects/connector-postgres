import { IPersistenceConfiguration } from '../src/persistence/persistence-configuration.interface';
import { IMigrationConfiguration } from '../src/migration/migration-configuration.interface';

export interface IIntegrationTestConfiguration {
    databaseConfig: IPersistenceConfiguration;
    migrationConfig: IMigrationConfiguration;
}