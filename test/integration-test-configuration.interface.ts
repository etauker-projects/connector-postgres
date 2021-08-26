import { IPersistenceConfiguration } from '../src/persistence-configuration.interface';

export interface IIntegrationTestConfiguration {
    databaseConfig: IPersistenceConfiguration;
}