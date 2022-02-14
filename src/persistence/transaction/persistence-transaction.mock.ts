import { randomUUID } from 'crypto';
import sinon, { SinonStub } from 'sinon';
import { PersistenceTransaction } from './persistence-transaction';
import { IPersistenceResult } from '../model/persistence-results.interface';

export class PersistenceTransactionMock {

    static getInstance(): PersistenceTransaction {
        return new PersistenceTransactionMock() as any as PersistenceTransaction
    }

    private inserted = 0;
    private updated = 0;
    private deleted = 0;
    private results: any[] = [];

    public continue: SinonStub;
    public commit: SinonStub;
    public rollback: SinonStub;
    public end: SinonStub;
    public ready: SinonStub;

    constructor() {
        this.results.push([{ id: randomUUID(), name: 'First' }]);
        this.continue = sinon.stub().callsFake(params => this.getResult(params));
        this.commit = sinon.stub().resolves();
        this.rollback = sinon.stub().resolves();
        this.end = sinon.stub().resolves();
        this.ready = sinon.stub().resolves();
    }

    private getResult(sql: string): Promise<IPersistenceResult<any>> {
        if (sql.includes('INSERT')) {
            this.inserted++;
            // TODO: parse SQL and insert
        } else if (sql.includes('UPDATE')) {
            this.updated++;
            // TODO: parse SQL and update
        } else if (sql.includes('DELETE')) {
            this.deleted++;
            // TODO: parse SQL and delete
        }

        return Promise.resolve({
            inserted: this.inserted,
            updated:  this.updated,
            deleted:  this.deleted,
            results:  this.results,
        });
    }
}

