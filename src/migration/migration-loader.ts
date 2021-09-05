import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { IMigration, IChange, IRollback } from './migration.interface';

export class MigrationLoader {

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
    public static loadMultipleMigrationMetadata(rootPath: string): Promise<IMigration[]> {
        return fs
            .readdir(rootPath)
            .then(subDirs => {
                return subDirs.map((migrationName) => {
                        const migrationPath =  path.resolve(rootPath, migrationName);
                        return MigrationLoader.loadSingleMigrationMetadata(migrationPath);
                    })
                })
            .then(res => Promise.all(res))
        ;
    }

    public static loadSingleMigrationMetadata(migrationPath: string): Promise<IMigration> {
        const migrationName =  path.basename(migrationPath, path.extname(migrationPath));
        const id = crypto.randomUUID();
        return Promise.all([
            this.loadChangeMetadata(path.resolve(migrationPath, 'change.sql'), id),
            this.loadRollbackMetadata(path.resolve(migrationPath, 'rollback.sql'), id),
        ])
        .then(items => {
            return {
                id,
                name: migrationName,
                change: items[0],
                rollback: items[1],
            }
        });
    }

    private static loadChangeMetadata(path: string, migrationId: string): Promise<IChange> {
        return fs
            .readFile(path, { encoding: 'utf-8' })
            .then(script => {
                const change: IChange = {
                    migrationId,
                    script,
                    type: 'CHANGE',
                    status: 'QUEUED',
                    hash: crypto.createHash('md5').update(script).digest('base64'),
                    path: path,
                }
                return change;
            })
        ;
    }

    private static loadRollbackMetadata(
        path: string,
        migrationId: string,
    ): Promise<IRollback> {

        return fs
            .readFile(path, { encoding: 'utf-8' })
            .then(script => {
                const rollback: IRollback = {
                    migrationId,
                    script,
                    type: 'ROLLBACK',
                    status: 'IGNORED',
                    hash: crypto.createHash('md5').update(script).digest('base64'),
                    path: path,
                }
                return rollback;
            })
        ;
    }

}
