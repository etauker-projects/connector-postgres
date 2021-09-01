import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { IMigration, IMigrationItem, IMigrationItemType } from './migration.interface';

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
    public static loadMigrationMetadata(rootPath: string): Promise<IMigration[]> {
        return fs
        .readdir(rootPath)
        .then(subDirs => {
            return subDirs.map((migrationName) => {
                    const id = crypto.randomUUID();
                    return Promise.all([
                        this.loadMigrationItemMetadata<'CHANGE'>(path.resolve(rootPath, migrationName, 'change.sql'), id, 'CHANGE'),
                        this.loadMigrationItemMetadata<'ROLLBACK'>(path.resolve(rootPath, migrationName, 'rollback.sql'), id, 'ROLLBACK'),
                    ])
                    .then(items => {
                        return {
                            id,
                            name: migrationName,
                            change: items[0],
                            rollback: items[1],
                        }
                    })
                })
            })
            .then(res => Promise.all(res))
        ;
    }

    private static loadMigrationItemMetadata<T extends IMigrationItemType>(
        path: string,
        migrationId: string,
        type: T,
    ): Promise<IMigrationItem<T>> {

        return fs
            .readFile(path, { encoding: 'utf-8' })
            .then(script => {
                return {
                    migrationId,
                    script,
                    type,
                    status: type === 'CHANGE' ? 'QUEUED' : 'IGNORED',
                    hash: crypto.createHash('md5').update(script).digest('base64'),
                    path: path,
                }
            })
        ;
    }

}
