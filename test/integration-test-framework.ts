import assert from 'assert';
import * as fs from 'fs/promises';
import * as pathModule from 'path';
import { IIntegrationTest } from './integration-test.interface';
import { IIntegrationTestSummary } from './integration-test-summary.interface';
import { IIntegrationTestConfiguration } from './integration-test-configuration.interface';
import { IIntegrationTestModule } from './integration-test-module.interface';
import { PersistenceConnector } from '../src/persistence/persistence-connector';
import { MigrationService } from '../src/migration/migration-service';


export class IntegrationTestFramework {

    public testConnection(connector: PersistenceConnector): Promise<boolean> {
        return this.getPostgresVersion(connector)
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
    
    public getPostgresVersion(connector: PersistenceConnector): Promise<string> {
        return connector
            .select<{ version: string }>('SELECT version();')
            .then(res => res[0].version)
        ;
    }

    public runMigrationChanges(migrationService: MigrationService, path: string): Promise<void> {
        return migrationService.loadAndExecuteChange(path);
    }

    public runMigrationRollbacks(migrationService: MigrationService, path: string): Promise<void> {
        return migrationService.loadAndExecuteRollback(path);
    }

    /**
     * Iterate through the provided directory and load all files that don't begin with '_'.
     * The object that is imported is expected to be an IIntegrationTestModule object.
     */
    public loadTests(testFilePath: string): Promise<IIntegrationTest[]> {
        return fs.readdir(testFilePath, { encoding: 'utf8' })
            .then(files => {
                const prom = files
                    .filter(file => !file.startsWith('_'))
                    .map(file => pathModule.resolve(testFilePath, file))
                    .map(fullpath => import(fullpath))
                    .map(promise => promise.then(mod => mod as IIntegrationTestModule))
                ;
                return Promise.all(prom);
            })
            .then(mods => {
                const results: IIntegrationTest[] = [];
                return mods
                    .reduce((combined, mod) => [...combined, ...mod.tests], results)
            })
    }

    public runSequentialTests(connector: PersistenceConnector, tests: IIntegrationTest[]): Promise<IIntegrationTestSummary[]> {
        const results: IIntegrationTestSummary[] = [];
        const run = (prom: Promise<void>, i: number): Promise<void> => {
            if (i >= tests.length) {
                return prom;
            }
            return this
                .executeTest(connector, tests[i])
                .then(summary => {
                    results.push(summary);
                    return run(Promise.resolve(), i+1);
                });
        }
        return run(Promise.resolve(), 0)
            .then(() => results.filter(res => res));
    }
    
    public executeTest(
        connector: PersistenceConnector,
        test: IIntegrationTest
    ): Promise<IIntegrationTestSummary> {
        return test
            .run(connector)
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
                user: 'security_admin', // TODO: change to "development_admin"
                password: 'admin',      // TODO: get from env or env file
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