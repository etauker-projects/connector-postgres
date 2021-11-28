import { IMigrationConfiguration, IPoolConfig } from "../src";

export interface IIntegrationTestConfiguration {
    databaseConfig: IPoolConfig;
    migrationConfig: IMigrationConfiguration;
}