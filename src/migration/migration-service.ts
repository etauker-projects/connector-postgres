import fs from 'fs/promises';
import path from 'path';
import { IPersistenceService } from '../persistence/persistence-service.interface';
import { IMigrationConfiguration } from './migration-configuration.interface';
import { IMigrationService } from './migration-service.interface';
import { IMigration } from './migration.interface';

export class MigrationService implements IMigrationService{

    private internalMigrationRoot: string;
    private config: IMigrationConfiguration;
    private persistenceService: IPersistenceService;

    constructor(
        config: Partial<IMigrationConfiguration>,
        persistenceService: IPersistenceService,
    ) {
        this.internalMigrationRoot = path.resolve('./migrations/internal');
        this.config = { debug: false, ...config };
        this.persistenceService = persistenceService;
    }

    /**
     * Executes migration instantiation logic.
     */
    public setup(): Promise<boolean> {
        this.debug('setting up database migrations');
        return this
            .loadMigrationMetadata(this.internalMigrationRoot)
            .then(migrations => this.executeMultipleMigrations(migrations))
            .then(result => {
                if (result === true) return result;
                else throw new Error('Some migrations failed to execute');
            })
        ;
    }

    /**
     * Load metadata for all migration files in the provided directory.
     * Returned metadata will be sorted in alphabetical order.
     * 
     * Assumes the following directory structure:
     * { rootPath }/
     *     { migrationName }/
     *         change.sql
     *         rollback.sql
     */
    private loadMigrationMetadata(rootPath: string): Promise<IMigration[]> {
        return fs
            .readdir(rootPath)
            .then(subDirs => {
                const migrations = subDirs.map((migrationName, index) => {
                    return {
                        name: migrationName,
                        index: index,
                        changePath: path.resolve(rootPath, migrationName, 'change.sql'),
                        rollbackPath: path.resolve(rootPath, migrationName, 'rollback.sql'),
                    };
                })
                return Promise.all(migrations);
            })
        ;
    }

    /**
     * Execute multiple database migrations in sequence.
     * If any of the migrations fail, the following migrations will not be executed.
     */
    private executeMultipleMigrations(migrations: IMigration[]): Promise<boolean> {

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
     * Attempt to execute the change file of a migration.
     * If the change file execution fails, execute the rollback file.
     * Returns false if the change file fails to execute (whether the rollback succeeds or not).
     */
    private executeSingleMigration(migration: IMigration): Promise<boolean> {

        this.debug(`${migration.name}: running migration`);
        return this.executeMigrationFile(migration.changePath)
            .then(() => this.debug(`${migration.name}: change successful`))
            .then(() => true)
            .catch(e => {

                this.debug(`${migration.name}: change failed:`, e.message);
                return this.executeMigrationFile(migration.rollbackPath)
                    .then(() => this.debug(`${migration.name}: rollback successful`))
                    .catch((err) => this.debug(`${migration.name}: rollback failed:`, err.message))
                    .then(() => false);
            })
        ;
    }

    /**
     * Execute the provided migration (change or rollback) file and return the number of executed statements.
     */
    private executeMigrationFile(fullPath: string): Promise<number> {
        return fs
            .readFile(fullPath, { encoding: 'utf-8' })
            .then(sql => this.persistenceService.update(sql, []))
        ;
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
