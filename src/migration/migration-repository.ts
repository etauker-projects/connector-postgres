import { IPersistenceService } from '../persistence/persistence-service.interface';
import { IMigration, IMigrationItem, IMigrationItemStatus, IMigrationItemType } from './migration.interface';

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

    public async saveSingleMigration(migration: IMigration): Promise<boolean> {
        const client = await this.persistenceService.startTransaction();
        const transact = this.persistenceService.transact.bind(this, client);

        try {
            const query = `SELECT * FROM public.migration WHERE name = '${migration.name}';`;
            const saved = (await transact(query)).results[0] as IMigration;

            if (saved) {
                await this.verifyChangeIntegrity(saved, migration, transact);
                await this.verifyRollbackIntegrity(saved, migration, transact);
            } else {
                await this.insertMigration(migration.id, migration.name, transact);
                await this.insertChange(migration.id, migration.change.hash, migration.change.status, transact);
                await this.insertRollback(migration.id, migration.rollback.hash, migration.rollback.status, transact);
            }

            // } else if (entry?.change?.status !== migration.change?.status) {
            //     // update status and executed as part of insert?
            // }

        } catch (e) {
            return this.persistenceService
                .stopTransaction(client, true)
                .then(() => Promise.reject(e))
            ;
        }
        return this.persistenceService
            .stopTransaction(client, true)
            .then(() => true)
        ;

    }

    private async insertMigration(id: string, name: string, transact: Function) {
        const query = `INSERT INTO public.migration (id, name) VALUES ('${id}', '${name}');`;
        return transact(query);
    }

    private async insertChange(id: string, hash: string, status: IMigrationItemStatus, transact: Function) {
        const query = `INSERT INTO public.change (migration_id, hash, status) VALUES ('${id}', '${hash}', '${status}');`;
        return transact(query);
    }

    private async insertRollback(id: string, hash: string, status: IMigrationItemStatus, transact: Function) {
        const query = `INSERT INTO public.rollback (migration_id, hash, status) VALUES ('${id}', '${hash}', '${status}');`;
        return transact(query);
    }

    private async verifyChangeIntegrity(saved: IMigration, loaded: IMigration, transact: Function) {
        const changeQuery = `SELECT * FROM public.change WHERE migration_id = '${saved.id}';`;
        let changeEntry = (await transact(changeQuery)).results[0] as IMigrationItem<'CHANGE'>;

        if (!changeEntry) {
            await this.insertChange(saved.id, loaded.change.hash, loaded.change.status, transact);
            changeEntry = (await transact(changeQuery)).results[0] as IMigrationItem<'CHANGE'>;
        }

        if (loaded?.change?.hash !== changeEntry.hash) {
            throw Error(`Migration '${loaded.name}' already has a change but with a different hash`);
        }
    }

    private async verifyRollbackIntegrity(saved: IMigration, loaded: IMigration, transact: Function) {
        const rollbackQuery = `SELECT * FROM public.rollback WHERE migration_id = '${saved.id}';`;
        let rollbackEntry = (await transact(rollbackQuery)).results[0] as IMigrationItem<'ROLLBACK'>;

        if (!rollbackEntry) {
            await this.insertRollback(saved.id, loaded.rollback.hash, loaded.rollback.status, transact);
            rollbackEntry = (await transact(rollbackQuery)).results[0] as IMigrationItem<'ROLLBACK'>;
        }

        if (loaded?.rollback?.hash !== rollbackEntry.hash) {
            throw Error(`Migration '${loaded.name}' already has a rollback but with a different hash`);
        }
    }
}