import sinon from 'sinon';
import { randomUUID } from 'crypto';
import { IPersistenceResult } from './persistence-results.interface';
import { PersistenceTransaction } from './persistence-transaction';

export class PersistenceTransactionMock {
    static getInstance(): PersistenceTransaction {
        return {
            continue: sinon.stub().resolves(PersistenceTransactionMock.getDefaultResult()),
            commit: sinon.stub().resolves(),
            rollback: sinon.stub().resolves(),
            end: sinon.stub().resolves(),
            ready: sinon.stub().resolves(),
        } as any as PersistenceTransaction
    }

    private static getDefaultResult(): IPersistenceResult<any> {
        return {
            inserted: 1,
            updated: 1,
            deleted: 1,
            results: [{ id: randomUUID() }],
        }
    }
}

