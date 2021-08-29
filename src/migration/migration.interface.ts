export interface IMigration {
    name: string;
    index: number;
    changePath: string;
    rollbackPath: string;
}