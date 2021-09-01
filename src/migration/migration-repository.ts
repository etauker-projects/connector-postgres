import { IPersistenceService } from '../persistence/persistence-service.interface';
import { IMigration } from './migration.interface';

export class MigrationRepository {

    private persistenceService: IPersistenceService;

    constructor(persistenceService: IPersistenceService) {
        this.persistenceService = persistenceService;
    }

    public saveMigrationMetadata(migrations: IMigration[]): Promise<boolean> {
        return Promise
            .all(migrations.map(migration => this.saveSingleMigration(migration)))
            .then(results => true)
        ;
    }

    public saveSingleMigration(migration: IMigration): Promise<boolean> {

        const migrationInsert = `
            INSERT INTO public.migration (id, name) VALUES
            ('${migration.id}', '${migration.name}')
            ON CONFLICT DO NOTHING;
        `;
        const changeInsert = `
            INSERT INTO public.change (migration_id, hash) VALUES
            ('${migration.id}', '${migration.change.hash}')
            ON CONFLICT (hash)
                DO UPDATE SET status = '${migration.change.status}';
        `;
        const rollbackInsert = `
            INSERT INTO public.rollback (migration_id, hash) VALUES
            ('${migration.id}', '${migration.rollback.hash}')
            ON CONFLICT (hash)
                DO UPDATE SET status = '${migration.rollback.status}';
        `;

        return this.persistenceService.update(migrationInsert + changeInsert + rollbackInsert)
            .then(res => {
                // console.log(res);
                return true;
            })
    }
}
