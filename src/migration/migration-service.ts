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
        this.internalMigrationRoot = path.resolve('./migrations/internal');
        this.config = { debug: false, ...config };
        this.persistenceService = persistenceService;
        this.migrationRepository = new MigrationRepository(persistenceService);
    }

    /**
     * Executes migration instantiation logic.
     */
    public setup(): Promise<void> {
        let metadata: IMigration[];

        this.debug('setting up database migrations...');
        return MigrationLoader
            .loadMultipleMigrationMetadata(this.internalMigrationRoot)
            .then(meta => metadata = meta)

            // TODO: do this in single transaction
            .then(() => this.executeSequentialChanges(metadata))
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
     * Rollback all executed migrations and delete all migration tables.
     * Delete all migration tables.
     */
    public clear(): Promise<void> {
        let metadata: IMigration[];

        this.debug('starting database rollbacks...');
        return MigrationLoader
            .loadMultipleMigrationMetadata(this.internalMigrationRoot)
            .then(meta => metadata = meta.reverse())

            // TODO: do this in single transaction
            .then(() => this.executeSequentialRollbacks(metadata))
        ;
    }

    /**
     * Load the metadata for the provided directory and
     * execute the migration change file.
     */
    public executeChange(migrationPath: string): Promise<void> {
        let client: IPersistenceClient;
        let migration: IMigration;

        return MigrationLoader
            .loadSingleMigrationMetadata(migrationPath)
            .then(m => migration = m)
            .then(() => this.migrationRepository.saveSingleMetadataInNewTransaction(migration))
            .then(() => this.persistenceService.startTransaction())
            .then(c => client = c)
            .then(() => this.persistenceService.continueTransaction(client, migration?.change?.script))
            .then(() => this.migrationRepository.getMigrationIdByName(client, migration?.name))
            .then(id => this.migrationRepository.updateChangeStatus(client, id, true))
            .then(() => this.persistenceService.endTransaction(client, true))
            .then(() => this.debug(`${migration.name}: change successful`))
            .then(() => {})
            .catch(error => {
                return this.migrationRepository.getMigrationIdByName(client, migration?.name)
                    .then(id => this.migrationRepository.updateChangeStatus(client, id, false))
                    .then(() => this.persistenceService.endTransaction(client, false))
                    .then(() => this.debug(`${migration.name}: change failed`))
                    .then(() => Promise.reject(error))
                ;
            })
        ;
    }

    /**
     * Load the metadata for the provided directory and
     * execute the migration rollback file.
     */
    public executeRollback(migrationPath: string): Promise<void> {
        let client: IPersistenceClient;
        let migration: IMigration;

        return MigrationLoader
            .loadSingleMigrationMetadata(migrationPath)
            .then(m => migration = m)
            .then(() => this.migrationRepository.saveSingleMetadataInNewTransaction(migration))
            .then(() => this.persistenceService.startTransaction())
            .then(c => client = c)
            .then(() => this.persistenceService.continueTransaction(client, migration?.rollback?.script))
            .then(() => this.migrationRepository.getMigrationIdByName(client, migration?.name))
            .then(id => this.migrationRepository.updateRollbackStatus(client, id, true))
            .then(() => this.persistenceService.endTransaction(client, true))
            .then(() => this.debug(`${migration.name}: rollback successful`))
            .then(() => {})
            .catch(error => {
                return this.migrationRepository.getMigrationIdByName(client, migration?.name)
                    .then(id => this.migrationRepository.updateRollbackStatus(client, id, false))
                    .then(() => this.persistenceService.endTransaction(client, false))
                    .then(() => this.debug(`${migration.name}: rollback failed`))
                    .then(() => Promise.reject(error))
                ;
            })
        ;
    }

    /**
     * Execute multiple database changes in sequence.
     * If any of the changes fail, the following changes will not be executed.
     */
    private executeSequentialChanges(migrations: IMigration[]): Promise<void> {

        const queueMigration = (previous: Promise<void>, i: number): Promise<void> => {
            if (i >= migrations.length) {
                this.debug('');
                this.debug('...all changes completed');
                return previous;
            }

            this.debug('');
            this.debug(`${migrations[i].name}: applying change`);
            return previous
                .then(() => this.executeMigrationScript(migrations[i]?.change?.script))
                .then(() => {
                    this.debug(`${migrations[i].name}: change applied successfully`);
                    return queueMigration(Promise.resolve(), i + 1);
                })
            ;
        }

        return queueMigration(Promise.resolve(), 0);
    }

    /**
     * Execute multiple database rollbacks in sequence.
     * If any of the rollbacks fail, the following rollbacks will not be executed.
     */
    private executeSequentialRollbacks(migrations: IMigration[]): Promise<void> {

        const queueMigration = (previous: Promise<void>, i: number): Promise<void> => {
            if (i >= migrations.length) {
                this.debug('');
                this.debug('...all rollbacks completed');
                return previous;
            }

            this.debug('');
            this.debug(`${migrations[i].name}: rolling back migration`);
            return previous
                .then(() => this.executeMigrationScript(migrations[i]?.rollback?.script))
                .then(() => {
                    this.debug(`${migrations[i].name}: rolled back successfully`);
                    return queueMigration(Promise.resolve(), i + 1);
                })
            ;
        }

        return queueMigration(Promise.resolve(), 0);
    }

    /**
     * Attempt to execute the change file of a migration.
     * If the change file execution fails, execute the rollback file.
     * Returns false if the change file fails to execute (whether the rollback succeeds or not).
     */
    private executeSingleMigration(migration: IMigration): Promise<boolean> {
        let client: IPersistenceClient;

        this.debug(`${migration.name}: running migration`);
        return this.persistenceService.startTransaction()
            .then(c => client = c)
            .then(() => this.persistenceService.continueTransaction(client, migration?.change?.script))
            .then(() => this.persistenceService.endTransaction(client, true))
            .then(() => this.debug(`${migration.name}: change successful`))
            .then(() => true)
            .catch(e => {

                this.debug(`${migration.name}: change failed:`, e.message);
                    return !client 
                        ? Promise.reject(e)
                        : this.executeMigrationScript(migration.rollback.script)
                        .then(() => this.persistenceService.continueTransaction(client, migration?.change?.script))
                            .then(() => this.persistenceService.endTransaction(client, false))
                            .then(() => Promise.reject(e))
                    ;
            })
        ;
    }

    /**
     * Execute the provided migration (change or rollback) script and return the number of executed statements.
     */
    private executeMigrationScript(script: string): Promise<number> {
        return this.persistenceService.updateInNewTransaction(script, []);
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
