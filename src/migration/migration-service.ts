import fs from 'fs/promises';
import path from 'path';
import { IPersistenceService } from '../persistence/persistence-service.interface';
import { IMigrationConfiguration } from './migration-configuration.interface';
import { IMigrationService } from './migration-service.interface';
import { IMigration, IMigrationItem, IMigrationItemType } from './migration.interface';
import { MigrationLoader } from './migration-loader';
import { MigrationRepository } from './migration-repository';

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
    public setup(): Promise<boolean> {
        let metadata: IMigration[];

        this.debug('setting up database migrations');
        return MigrationLoader
            .loadMigrationMetadata(this.internalMigrationRoot)
            .then(meta => metadata = meta)
            .then(() => this.executeSequentialMigrations(metadata))
            .then(() => this.migrationRepository.saveMigrationMetadata(metadata))
            .then(result => {
                if (result === true) return result;
                else throw new Error('Some migrations failed to execute');
            })
        ;
    }

    /**
     * Rollback all executed migrations and delete all migration tables.
     * Delete all migration tables.
     */
    public clear(): Promise<boolean> {
        let metadata: IMigrationItem<'ROLLBACK'>[];

        this.debug('setting up database migrations');
        return MigrationLoader
            .loadMigrationMetadata(this.internalMigrationRoot)
            .then(meta => metadata = meta.reverse().map(mig => mig.rollback))
            .then(() => this.executeSequentialMigrationItems(metadata))
            .then(result => {
                if (result === true) return result;
                else throw new Error('Some migrations failed to execute');
            })
        ;
    }

    /**
     * Execute multiple database migrations in sequence.
     * If any of the migrations fail, the following migrations will not be executed.
     */
    private executeSequentialMigrations(migrations: IMigration[]): Promise<boolean> {

        const queueMigration = (previous: Promise<boolean>, i: number): Promise<boolean> => {
            if (i >= migrations.length) {
                this.debug('');
                this.debug('all migrations completed');
                return previous;
            }

            this.debug('');
            this.debug(`${migrations[i].name}: queueing migration`);
            return previous
                .then(() => this.executeSingleMigration(migrations[i]))
                .then(isSuccessful => isSuccessful
                    ? queueMigration(Promise.resolve(true), i + 1)
                    : false
                )
            ;
        }

        return queueMigration(Promise.resolve(true), 0);
    }

    /**
     * Execute multiple database migration items in sequence.
     * If any of the migrations items fail, the following migrations items will not be executed.
     */
        private executeSequentialMigrationItems<T extends IMigrationItemType>(
            migrations: IMigrationItem<T>[],
        ): Promise<boolean> {

        const queueMigration = (previous: Promise<boolean>, i: number): Promise<boolean> => {
            if (i >= migrations.length) {
                this.debug('');
                this.debug('all migration items completed');
                return previous;
            }

            this.debug('');
            this.debug(`${migrations[i].migrationId}: queueing migration`);
            return previous
                .then(() => this.executeMigrationScript(migrations[i].script))
                .then(isSuccessful => isSuccessful
                    ? queueMigration(Promise.resolve(true), i + 1)
                    : false
                )
            ;
        }

        return queueMigration(Promise.resolve(true), 0);
    }

    /**
     * Attempt to execute the change file of a migration.
     * If the change file execution fails, execute the rollback file.
     * Returns false if the change file fails to execute (whether the rollback succeeds or not).
     */
    private executeSingleMigration(migration: IMigration): Promise<boolean> {

        this.debug(`${migration.name}: running migration`);
        return this.executeMigrationScript(migration.change.script)
            .then(() => this.debug(`${migration.name}: change successful`))
            .then(() => migration.change.status = 'SUCCESS')
            .then(() => true)
            .catch(e => {

                this.debug(`${migration.name}: change failed:`, e.message);
                migration.change.status = 'FAILURE';

                return this.executeMigrationScript(migration.rollback.script)
                    .then(() => this.debug(`${migration.name}: rollback successful`))
                    .then(() => migration.rollback.status = 'SUCCESS')
                    .catch((err) => this.debug(`${migration.name}: rollback failed:`, err.message))
                    .then(() => migration.rollback.status = 'FAILURE')
                    .then(() => false);
            })
        ;
    }

    /**
     * Execute the provided migration (change or rollback) file and return the number of executed statements.
     */
    public executeMigrationFile(fullPath: string): Promise<number> {
        return fs
            .readFile(fullPath, { encoding: 'utf-8' })
            .then(sql => this.persistenceService.update(sql, []))
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
