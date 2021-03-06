import url from 'url';
import path from 'path';
import { IntegrationTestFramework } from './integration-test-framework';
import { IIntegrationTestConfiguration } from './integration-test-configuration.interface';
import { IPool, MigrationService, PersistenceConnector, PoolFactory } from '../src';

let pool: IPool;
let testConfig: IIntegrationTestConfiguration;
let connector: PersistenceConnector;
let migrationService: MigrationService;

const configPath = ''; // TODO get from parameters
const currentFilename = url.fileURLToPath(import.meta.url);
const currentDirname = path.dirname(currentFilename);
const rootPath = path.resolve(currentDirname); // TODO get from parameters
const testFileRoot = path.resolve(rootPath, 'tests');
const testMigrationPath = path.resolve(rootPath, 'migrations');
const framework = new IntegrationTestFramework();


framework.loadTestConfig(configPath)
    .then(config => testConfig = config)
    .then(() => pool = new PoolFactory().makePool(testConfig.databaseConfig))

    .then(() => new PersistenceConnector(pool))
    .then(service => connector = service)

    .then(() => new MigrationService(testConfig.migrationConfig, connector))
    .then(service => migrationService = service)

    .then(() => framework.testConnection(connector))
    .then(() => console.log('connection successful'))

    .then(() => migrationService.clear())
    .then(() => migrationService.setup())

    .then(() => framework.runMigrationChanges(migrationService, testMigrationPath))
    .then(() => framework.loadTests(testFileRoot))
    .then(tests => framework.runSequentialTests(connector, tests))
    .then(() => framework.runMigrationRollbacks(migrationService, testMigrationPath))
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Error:', err.message);
        process.exit(1);
    })
;
