import { IPersistenceResult } from '../persistence/persistence-results.interface';
import { PersistenceService } from '../persistence/persistence-service';
import { PersistenceTransaction } from '../persistence/persistence-transaction';
import { IMigration, IMigrationItem, IMigrationItemStatus } from './migration.interface';

export class MigrationRepository {

    private persistenceService: PersistenceService;

    constructor(persistenceService: PersistenceService) {
        this.persistenceService = persistenceService;
    }

    //------------------------------
    // Public methods
    //------------------------------
    public saveMultipleMetadataInNewTransaction(migrations: IMigration[]): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const transaction = this.persistenceService.transact();
            try {
                const promises = migrations.map(migration => this.saveSingleMetadata(transaction, migration));
                await Promise.all(promises);
                await transaction.end(true);
                resolve();
            } catch (e) {
                await transaction.end(false);
                reject(e);
            }
        });
    }

    public saveSingleMetadataInNewTransaction(migration: IMigration): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const transaction = this.persistenceService.transact();
            try {
                await this.saveSingleMetadata(transaction, migration);
                await transaction.end(true);
                resolve();
            } catch (e) {
                await transaction.end(false);
                reject(e);
            }
        });
    }

    public getMigrationIdByName(transaction: PersistenceTransaction, migrationName: string): Promise<string> {
        const query = `SELECT id FROM public.migration WHERE name = '${ migrationName }';`;
        return transaction.continue(query).then(res => {
            return (res as IPersistenceResult<{ id: string }>).results[0].id;
        })
    }

    public async saveSingleMetadata(transaction: PersistenceTransaction, migration: IMigration): Promise<void> {
        const transact = transaction.continue.bind(transaction);

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

    public updateChangeStatus(transaction: PersistenceTransaction, migrationId: string, success: boolean): Promise<void> {
        const status: IMigrationItemStatus = success ? 'SUCCESS' : 'FAILURE';
        const executionTimestamp = success ? ', executed_at = now()' : '';
        const query = `UPDATE public.change SET status = '${ status }'${ executionTimestamp } WHERE migration_id = '${ migrationId }';`;
        return transaction.continue(query).then();
    }

    public updateRollbackStatus(transaction: PersistenceTransaction, migrationId: string, success: boolean): Promise<void> {
        const status: IMigrationItemStatus = success ? 'SUCCESS' : 'FAILURE';
        const executionTimestamp = success ? ', executed_at = now()' : '';
        const query = `UPDATE public.rollback SET status = '${ status }'${ executionTimestamp } WHERE migration_id = '${ migrationId }';`;
        return transaction.continue(query).then();
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
