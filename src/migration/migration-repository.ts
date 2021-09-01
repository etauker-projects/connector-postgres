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

            INSERT INTO public.change (migration_id, hash, status) VALUES
            ('${migration.id}', '${migration.change.hash}', '${migration.change.status}')
            ON CONFLICT (hash) DO UPDATE SET 
                status = '${migration.change.status}',
                executed_at = NOW();

            INSERT INTO public.rollback (migration_id, hash, status) VALUES
            ('${migration.id}', '${migration.rollback.hash}', '${migration.rollback.status}')
            ON CONFLICT (hash) DO UPDATE SET 
                status = '${migration.rollback.status}',
                executed_at = NOW();
        `;

        return this.persistenceService.update(migrationInsert)
            .then(res => {
                // console.log(res);
                return true;
            })
    }
}
