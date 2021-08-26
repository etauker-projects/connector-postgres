import path from 'path';
import { PersistenceService } from '../src/persistence-service';
import { IntegrationTestFramework } from './integration-test-framework';
import { IPersistenceService } from '../src/persistence-service.interface';

let service: IPersistenceService;
const configPath = ''; // TODO get from parameters
const rootPath = path.resolve(process.cwd(), './test/tests/persistence-service-tests.ts'); // TODO get from parameters
const framework = new IntegrationTestFramework();

framework.loadTestConfig(configPath)
    .then(config => new PersistenceService(config.databaseConfig))
    .then(persistenceService => service = persistenceService)
    .then(() => framework.testConnection(service))
    .catch(() => process.exit(1))
    .then(() => framework.loadTests(rootPath))
    .then(tests => {
        const testPromises = tests.map(test => framework.executeTest(service, test));
        Promise.all(testPromises).then(results => console.log(results));
    })
;
