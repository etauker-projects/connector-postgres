import url from 'url';
import path from 'path';

import { IPersistenceService } from '../persistence/persistence-service.interface';
import { IMigrationConfiguration } from './migration-configuration.interface';
import { IMigrationService } from './migration-service.interface';
import { IChange, IMigration } from './migration.interface';
import { MigrationLoader } from './migration-loader';
import { MigrationRepository } from './migration-repository';
import { IPersistenceClient } from '../persistence/persistence-client.interface';

export class MigrationService implements IMigrationService {

    private internalMigrationRoot: string;
    private config: IMigrationConfiguration;
    private persistenceService: IPersistenceService;
    private migrationRepository: MigrationRepository;

    constructor(
        config: Partial<IMigrationConfiguration>,
        persistenceService: IPersistenceService,
    ) {
        const currentFilename = url.fileURLToPath(import.meta.url);
        const currentDirname = path.dirname(currentFilename);
        this.internalMigrationRoot = path.resolve(currentDirname, '..', '..', 'migrations', 'internal');
        this.config = { debug: false, ...config };
        this.persistenceService = persistenceService;
        this.migrationRepository = new MigrationRepository(persistenceService);
    }

    /**
     * Create migration tables.
     */
    public setup(): Promise<void> {
        let metadata: IMigration[];

        this.debug('setting up database migrations...');
        return MigrationLoader
            .loadMultipleMigrationMetadata(this.internalMigrationRoot)
            .then(meta => metadata = meta)
            .then(() => this.executeSequentialChanges(metadata, false))
            .then(() => {

                // migrations already executed, set status to success
                metadata = metadata.map(meta => {
                    const change: IChange = { ...meta.change, status: 'SUCCESS' };
                    return { ...meta, change };
                })

            })
            .then(() => this.migrationRepository.saveMultipleMetadataInNewTransaction(metadata))
        ;
    }

    /**
     * Delete all migration tables.
     */
    public clear(): Promise<void> {
        let metadata: IMigration[];

        this.debug('starting database rollbacks...');
        return MigrationLoader
            .loadMultipleMigrationMetadata(this.internalMigrationRoot)
            .then(meta => metadata = meta.reverse())
            .then(() => this.executeSequentialRollbacks(metadata, false))
        ;
    }

    /**
     * Load the metadata for all migrations inside the provided directory and execute the migration change file.
     * Also save the migrations inside the migration table with the appropriate change statuses.
     */
    public loadAndExecuteChanges(migrationRootPath: string): Promise<void> {
        return MigrationLoader
            .loadMultipleMigrationMetadata(migrationRootPath)
            .then(migrations => this.executeSequentialChanges(migrations))
            .then(() => {})
        ;
    }

    /**
     * Load the metadata for all migrations inside the provided directory and execute the migration rollback file.
     * Also save the migrations inside the migration table with the appropriate rollback statuses.
     */
     public loadAndExecuteRollbacks(migrationRootPath: string): Promise<void> {
        return MigrationLoader
            .loadMultipleMigrationMetadata(migrationRootPath)
            .then(migrations => this.executeSequentialRollbacks(migrations))
            .then(() => {})
        ;
    }

    /**
     * Load the metadata for the provided directory and execute the migration change file.
     * Also save the migration inside the migration table with the appropriate change status.
     */
     public loadAndExecuteChange(migrationPath: string): Promise<void> {
        return MigrationLoader
            .loadSingleMigrationMetadata(migrationPath)
            .then(migration => this.executeChange(migration))
        ;
    }

    /**
     * Load the metadata for the provided directory and execute the migration rollback file.
     * Also save the migration inside the migration table with the appropriate rollback status.
     */
    public loadAndExecuteRollback(migrationPath: string): Promise<void> {
        return MigrationLoader
            .loadSingleMigrationMetadata(migrationPath)
            .then(migration => this.executeRollback(migration))
        ;
    }

    /**
     * Execute the change of the provided migration and update
     * the status of the change inside the migration database table.
     */
    public executeChange(migration: IMigration, saveMetadata = true): Promise<void> {
        let client: IPersistenceClient;

        return (saveMetadata ? this.migrationRepository.saveSingleMetadataInNewTransaction(migration): Promise.resolve())
            .then(() => this.persistenceService.startTransaction())
            .then(c => client = c)
            .then(() => this.persistenceService.continueTransaction(client, migration?.change?.script))
            .then(() => saveMetadata ? this.migrationRepository.getMigrationIdByName(client, migration?.name) : Promise.resolve(''))
            .then(id => saveMetadata ? this.migrationRepository.updateChangeStatus(client, id, true) : Promise.resolve())
            .then(() => this.persistenceService.endTransaction(client, true))
            .then(() => this.debug(`${migration.name}: change successful`))
            .then(() => {})
            .catch(error => {                
                return client
                    ? (saveMetadata ? this.migrationRepository.getMigrationIdByName(client, migration?.name).catch(e => console.warn('The following error ocurred while handling another error (see original below): ' + e)) : Promise.resolve(''))
                        .then(id => saveMetadata && id ? this.migrationRepository.updateChangeStatus(client, id, false).catch(e => console.warn('The following error ocurred while handling another error (see original below): ' + e)) : Promise.resolve())
                        .then(() => this.persistenceService.endTransaction(client, false))
                        .then(() => this.debug(`${migration.name}: change failed`))
                        .catch(e => console.warn('The following error ocurred while handling another error (see original below): ' + e))
                        .then(() => Promise.reject(error))
                        : Promise.reject(error)
                ;
            })
        ;
    }

    /**
     * Execute the rollback of the provided migration and update
     * the status of the rollback inside the migration database table.
     */
    public executeRollback(migration: IMigration, saveMetadata = true): Promise<void> {
        let client: IPersistenceClient;

        return (saveMetadata ? this.migrationRepository.saveSingleMetadataInNewTransaction(migration): Promise.resolve())
            .then(() => this.persistenceService.startTransaction())
            .then(c => client = c)
            .then(() => this.persistenceService.continueTransaction(client, migration?.rollback?.script))
            .then(() => saveMetadata ? this.migrationRepository.getMigrationIdByName(client, migration?.name): Promise.resolve(''))
            .then(id => saveMetadata ? this.migrationRepository.updateRollbackStatus(client, id, true) : Promise.resolve())
            .then(() => this.persistenceService.endTransaction(client, true))
            .then(() => this.debug(`${migration.name}: rollback successful`))
            .then(() => {})
            .catch(error => {
                return client
                    ? (saveMetadata ? this.migrationRepository.getMigrationIdByName(client, migration?.name): Promise.resolve(''))
                        .then(id => saveMetadata ? this.migrationRepository.updateRollbackStatus(client, id, false) : Promise.resolve())
                        .then(() => this.persistenceService.endTransaction(client, false))
                        .then(() => this.debug(`${migration.name}: rollback failed`))
                        .then(() => Promise.reject(error))
                    : Promise.reject(error)
                ;
            })
        ;
    }

    /**
     * Execute multiple database changes in sequence.
     * If any of the changes fail, the following changes will not be executed.
     * Also updates the status of the changes inside the migration table.
     */
    public executeSequentialChanges(migrations: IMigration[], saveMetadata = true): Promise<void> {

        const queueMigration = (previous: Promise<void>, i: number): Promise<void> => {
            if (i >= migrations.length) {
                this.debug('');
                this.debug('...all changes completed');
                return previous;
            }

            this.debug('');
            this.debug(`${migrations[i].name}: applying change`);
            return previous
                .then(() => this.executeChange(migrations[i], saveMetadata))
                .then(() => queueMigration(Promise.resolve(), i + 1))
            ;
        }

        return queueMigration(Promise.resolve(), 0);
    }

    /**
     * Execute multiple database rollbacks in sequence.
     * If any of the rollbacks fail, the following rollbacks will not be executed.
     * Also updates the status of the rollbacks inside the migration table.
     */
    public executeSequentialRollbacks(migrations: IMigration[], saveMetadata = true): Promise<void> {

        const queueMigration = (previous: Promise<void>, i: number): Promise<void> => {
            if (i >= migrations.length) {
                this.debug('');
                this.debug('...all rollbacks completed');
                return previous;
            }

            this.debug('');
            this.debug(`${migrations[i].name}: rolling back migration`);
            return previous
                .then(() => this.executeRollback(migrations[i], saveMetadata))
                .then(() => queueMigration(Promise.resolve(), i + 1))
            ;
        }

        return queueMigration(Promise.resolve(), 0);
    }

    /**
     * Log the provided arguments if debug mode is enabled.
     */
    private debug(...message: any[]): void {
        if (this.config.debug) {
            console.log(...message);
        }
    }

}
