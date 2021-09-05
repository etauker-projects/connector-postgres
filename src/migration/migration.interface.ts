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

export interface IMigration {
    id: string;
    name: string;
    // on_failure: 'STOP' | 'SKIP' | 'ROLLBACK';
    change: IMigrationItem<'CHANGE'>;
    rollback: IMigrationItem<'ROLLBACK'>;
}