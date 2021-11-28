export type IMigrationItemType = 'CHANGE' | 'ROLLBACK';
export type IMigrationItemStatus = 'QUEUED' | 'SUCCESS' | 'FAILURE' | 'IGNORED';

export interface IMigrationItem<IMigrationItemType> {
    migrationId: string;
    hash: string;
    status: IMigrationItemStatus;
    script: string;
    createdAt?: string;
    executedAt?: string;
    path?: string;
    type: IMigrationItemType;
}

export interface IRollback extends IMigrationItem<'ROLLBACK'> {
    type: 'ROLLBACK';
}

export interface IChange extends IMigrationItem<'CHANGE'> {
    type: 'CHANGE';
}

export interface IMigration {
    id: string;
    name: string;
    change: IChange;
    rollback: IRollback;
}