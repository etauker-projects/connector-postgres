import path from 'path';
import { IPersistenceService } from '../persistence/persistence-service.interface';
import { IMigrationConfiguration } from './migration-configuration.interface';
import { IMigrationService } from './migration-service.interface';
import { IChange, IMigration, IRollback } from './migration.interface';
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
            .then(() => this.executeSequentialMigrations(metadata))
            .then(() => {

                // migrations already executed, set status to success
                metadata = metadata.map(meta => {
                    const rollback: IRollback = { ...meta.rollback, status: 'SUCCESS' };
                    const change: IChange = { ...meta.change, status: 'SUCCESS' };
                    return { ...meta, rollback, change };
                })

            })
            .then(() => this.migrationRepository.saveMultipleMigrationMetadata(metadata))
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
            .then(() => this.migrationRepository.saveSingleMigrationMetadata(migration))
            .then(() => this.persistenceService.startTransaction())
            .then(c => client = c)
            .then(() => this.executeSingleChange(client, migration.id, migration.name, migration.change))
            .then(() => this.migrationRepository.updateChangeMetadata(client, migration.change, true))
            .then(() => this.persistenceService.endTransaction(client, true))
            .then(() => {})
            .catch(error => {
                this.migrationRepository.updateChangeMetadata(client, migration.change, false);
                this.persistenceService.endTransaction(client, true)
                throw error;
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
            .then(() => this.migrationRepository.saveSingleMigrationMetadata(migration))
            .then(() => this.persistenceService.startTransaction())
            .then(c => client = c)
            .then(() => this.executeSingleRollback(client, migration.id, migration.name, migration.rollback))
            .then(() => this.migrationRepository.updateRollbackMetadata(client, migration.rollback, true))
            .then(() => this.persistenceService.endTransaction(client, true))
            .then(() => {})
            .catch(error => {
                this.migrationRepository.updateRollbackMetadata(client, migration.rollback, false);
                this.persistenceService.endTransaction(client, true)
                throw error;
            })
        ;
    }

    /**
     * Execute multiple database migrations in sequence.
     * If any of the migrations fail, the following migrations will not be executed.
     */
    private executeSequentialMigrations(migrations: IMigration[]): Promise<void> {

        const queueMigration = (previous: Promise<void>, i: number): Promise<void> => {
            if (i >= migrations.length) {
                this.debug('');
                return previous;
            }

            this.debug('');
            this.debug(`${migrations[i].name}: queueing migration`);
            return previous
                .then(() => this.executeSingleMigration(migrations[i]))
                .then(() => queueMigration(Promise.resolve(), i + 1))
                .catch((error) => Promise.reject(error))
            ;
        }

        return queueMigration(Promise.resolve(), 0);
    }

    /**
     * Execute multiple database migration items in sequence.
     * If any of the migrations items fail, the following migrations items will not be executed.
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
                .then(() => this.executeMigrationScript(migrations[i].rollback.script))
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
            .then(client => this.executeSingleChange(client, migration.id, migration.name, migration.change))
            .then(() => this.persistenceService.endTransaction(client, true))
            .then(() => true)
            .catch(e => {

                this.debug(`${migration.name}: change failed:`, e.message);
                    return !client 
                        ? Promise.reject(e)
                        : this.executeMigrationScript(migration.rollback.script)
                            .then(() => this.executeSingleRollback(client, migration.id, migration.name, migration.rollback))
                            .then(() => this.persistenceService.endTransaction(client, false))
                            .then(() => Promise.reject(e))
                    ;
            })
        ;
    }

    private executeSingleChange(
        client: IPersistenceClient,
        id: string,
        name: string,
        change: IChange,
    ): Promise<void> {
        return this.persistenceService.continueTransaction(client, change.script)
            .then(() => this.debug(`${name}: change successful`))
            .then(() => {});
        ;
    }

    private executeSingleRollback(
        client: IPersistenceClient,
        id: string,
        name: string,
        rollback: IRollback,
    ): Promise<void> {
        return this.persistenceService.continueTransaction(client, rollback.script)
            .then(() => this.debug(`${name}: rollback successful`))
            .then(() => {});
        ;
    }

    /**
     * Execute the provided migration (change or rollback) script and return the number of executed statements.
     */
    private executeMigrationScript(script: string): Promise<number> {
        return this.persistenceService.update(script, []);
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
