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
const rootPath = path.resolve(process.cwd(), './test/tests/persistence-service-tests.ts'); // TODO get from parameters
const framework = new IntegrationTestFramework();

framework.loadTestConfig(configPath)
    .then(config => testConfig = config)

    .then(() => new PersistenceService(testConfig.databaseConfig))
    .then(service => persistenceService = service)

    .then(() => new MigrationService(testConfig.migrationConfig, persistenceService))
    .then(service => migrationService = service)
    // .then(() => migrationService.clear())
    .then(() => migrationService.setup())

    .then(() => framework.testConnection(persistenceService, migrationService))
    .catch((err) => {
        console.error('Error:', err.message);
        process.exit(1);
    })

    .then(() => framework.loadTests(rootPath))
    .then(tests => {
        const testPromises = tests.map(test => framework.executeTest(persistenceService, test));
        Promise.all(testPromises).then(results => console.log(results));
    })
;
