import assert from 'assert';
import { IIntegrationTest } from './integration-test.interface';
import { IPersistenceService } from '../src/persistence/persistence-service.interface';
import { IIntegrationTestSummary } from './integration-test-summary.interface';
import { IIntegrationTestConfiguration } from './integration-test-configuration.interface';
import { IIntegrationTestModule } from './integration-test-module.interface';
import { IMigrationService } from '../src/migration/migration-service.interface';


export class IntegrationTestFramework {

    public testConnection(persistenceService: IPersistenceService, migrationService: IMigrationService): Promise<boolean> {
        return this.getPostgresVersion(persistenceService)
            .then(version => {
                console.log('');
                console.log('Integration tests running against postgres server:');
                console.log(version);
                console.log('');
                const message = `Failed to connect to database:`;
                assert(version.startsWith('PostgreSQL'), message);
                return true;
            })
            .catch(e => {
                console.log('');
                console.error('Connection to postgres server failed:');
                console.error(e);
                throw e;
            })
        ;
    }
    
    public getPostgresVersion(persistenceService: IPersistenceService): Promise<string> {
        return persistenceService
            .query<{ version: string }>('SELECT version();')
            .then(res => res.results[0].version)
        ;
    }
    
    // Test file must export IIntegrationTestModule object
    public loadTests(rootPath: string): Promise<IIntegrationTest[]> {
        // TODO: recursively iterate over files under rootPath
        return import(rootPath).then((mod: IIntegrationTestModule) => mod.tests);
    }
    
    public executeTest(
        persistenceService: IPersistenceService,
        test: IIntegrationTest
    ): Promise<IIntegrationTestSummary> {
        return test
            .run(persistenceService)
            .then(result => {
                const status = result.success ? 'SUCCESS' : 'FAILURE';
                console.log(`[${status}] ${test.suite} - ${test.name}`);
                return {
                    suite: test.suite,
                    name: test.name,
                    success: result.success,
                    message: result.message,
                }
            })
            .catch(error => {
                const message = error instanceof Error ? error.message : error;
                console.error(`[FAILURE] ${test.suite} - ${test.name} (${message})`);    
                return {
                    suite: test.suite,
                    name: test.name,
                    success: false,
                    message: message,
                }
            })
        ;
    }

    public loadTestConfig(configPath: string): Promise<IIntegrationTestConfiguration> {
        return Promise.resolve({
            databaseConfig: {
                database: 'local_01',
                user: 'local_01_admin',
                password: 'admin',
                host: 'localhost',
                port: 5432,
                ssl: false,
                max: 5,
                idleTimeoutMillis: 1000, // close idle clients after 1 second
                connectionTimeoutMillis: 1000, // return an error after 1 second if connection could not be established
            },
            migrationConfig: {
                debug: true,
            }
        });
    }
}