import { IPersistenceClient } from '../persistence/persistence-client.interface';
import { IPersistenceResult } from '../persistence/persistence-results.interface';
import { IPersistenceService } from '../persistence/persistence-service.interface';
import { IMigration, IMigrationItem, IMigrationItemStatus } from './migration.interface';

export class MigrationRepository {

    private persistenceService: IPersistenceService;

    constructor(persistenceService: IPersistenceService) {
        this.persistenceService = persistenceService;
    }

    //------------------------------
    // Public methods
    //------------------------------
    public saveMultipleMetadataInNewTransaction(migrations: IMigration[]): Promise<void> {
        return this.persistenceService.startTransaction().then(async client => {
            try {
                const promises = migrations.map(migration => this.saveSingleMetadata(client, migration));
                await Promise.all(promises);
                await this.persistenceService.endTransaction(client, true);
                return Promise.resolve();
            } catch (e) {
                await this.persistenceService.endTransaction(client, false);
                return Promise.reject(e);
            }
        });
        
        ;
    }

    public saveSingleMetadataInNewTransaction(migration: IMigration): Promise<void> {
        return this.persistenceService.startTransaction().then(async client => {
            try {
                await this.saveSingleMetadata(client, migration);
                await this.persistenceService.endTransaction(client, true);
                return Promise.resolve();
            } catch (e) {
                await this.persistenceService.endTransaction(client, false);
                return Promise.reject(e);
            }
        });
    }

    public getMigrationIdByName(client: IPersistenceClient, migrationName: string): Promise<string> {
        const transact = this.persistenceService.continueTransaction.bind(this, client);
        const query = `SELECT id FROM public.migration WHERE name = '${ migrationName }';`;
        return transact(query).then(res => {
            return (res as IPersistenceResult<{ id: string }>).results[0].id;
        })
    }

    public async saveSingleMetadata(client: IPersistenceClient, migration: IMigration): Promise<void> {
        const transact = this.persistenceService.continueTransaction.bind(this, client);

        try {
            const query = `SELECT * FROM public.migration WHERE name = '${migration.name}';`;
            const saved = (await transact(query)).results[0] as IMigration;

            if (saved) {
                await this.verifyChangeIntegrity(saved, migration, transact);
                await this.verifyRollbackIntegrity(saved, migration, transact);
            } else {
                await this.insertMigration(migration.id, migration.name, transact);
                await this.insertChange(migration.id, migration.change.hash, migration.change.status, transact, migration.change.executedAt);
                await this.insertRollback(migration.id, migration.rollback.hash, migration.rollback.status, transact, migration.rollback.executedAt);
                return Promise.resolve();
            }

        } catch (e) {
            return Promise.reject(e);
        }
    }

    public updateChangeStatus(client: IPersistenceClient, migrationId: string, success: boolean): Promise<void> {
        const transact = this.persistenceService.continueTransaction.bind(this, client);
        const status: IMigrationItemStatus = success ? 'SUCCESS' : 'FAILURE';
        const executionTimestamp = success ? ', executed_at = now()' : '';
        const query = `UPDATE public.change SET status = '${ status }'${ executionTimestamp } WHERE migration_id = '${ migrationId }';`;
        return transact(query).then();
    }

    public updateRollbackStatus(client: IPersistenceClient, migrationId: string, success: boolean): Promise<void> {
        const transact = this.persistenceService.continueTransaction.bind(this, client);
        const status: IMigrationItemStatus = success ? 'SUCCESS' : 'FAILURE';
        const executionTimestamp = success ? ', executed_at = now()' : '';
        const query = `UPDATE public.rollback SET status = '${ status }'${ executionTimestamp } WHERE migration_id = '${ migrationId }';`;
        return transact(query).then();
    }

    //------------------------------
    // Private methods
    //------------------------------
    private insertMigration(id: string, name: string, transact: Function) {
        const query = `INSERT INTO public.migration (id, name) VALUES ('${id}', '${name}');`;
        return transact(query);
    }

    private insertChange(id: string, hash: string, status: IMigrationItemStatus, transact: Function, executedAt: string = 'null') {
        const query = `INSERT INTO public.change (migration_id, hash, status, executed_at) VALUES ('${id}', '${hash}', '${status}', ${executedAt});`;
        return transact(query);
    }

    private insertRollback(id: string, hash: string, status: IMigrationItemStatus, transact: Function, executedAt: string = 'null') {
        const query = `INSERT INTO public.rollback (migration_id, hash, status, executed_at) VALUES ('${id}', '${hash}', '${status}', ${executedAt});`;
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
