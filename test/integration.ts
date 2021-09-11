import path from 'path';
import { PersistenceService } from '../src/persistence/persistence-service';
import { IntegrationTestFramework } from './integration-test-framework';
import { IPersistenceService } from '../src/persistence/persistence-service.interface';
import { MigrationService } from '../src/migration/migration-service';
import { IMigrationService } from '../src/migration/migration-service.interface';
import { IIntegrationTestConfiguration } from './integration-test-configuration.interface';

let testConfig: IIntegrationTestConfiguration;
let persistenceService: IPersistenceService;
let migrationService: IMigrationService;

const configPath = ''; // TODO get from parameters
const rootPath = path.resolve(process.cwd(), 'test'); // TODO get from parameters
const testFileRoot = path.resolve(rootPath, 'tests');
const testMigrationPath = path.resolve(rootPath, 'migrations');
const framework = new IntegrationTestFramework();

framework.loadTestConfig(configPath)
    .then(config => testConfig = config)

    .then(() => new PersistenceService(testConfig.databaseConfig))
    .then(service => persistenceService = service)

    .then(() => new MigrationService(testConfig.migrationConfig, persistenceService))
    .then(service => migrationService = service)
    .then(() => migrationService.clear())
    .then(() => migrationService.setup())

    .then(() => framework.testConnection(persistenceService, migrationService))
    .then(() => framework.runMigrationChanges(migrationService, testMigrationPath))
    
    .then(() => framework.loadTests(testFileRoot))
    .then(tests => framework.runSequentialTests(persistenceService, tests))
    .then(() => framework.runMigrationRollbacks(migrationService, testMigrationPath))
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Error:', err.message);
        process.exit(1);
    })
;
