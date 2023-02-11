import 'mocha';
import sinon from 'sinon';
import assert from 'assert';
import { PersistenceTransaction } from './persistence-transaction';
import { IPoolClient } from '../../postgres/model/postgres-pool-client.interface';

describe('PersistenceTransaction', () => {

    let client: IPoolClient;
    let transaction: PersistenceTransaction;
    let mock: {
        query: sinon.SinonStub;
        release: sinon.SinonStub;
    };

    beforeEach(() => {
        mock = {
            release: sinon.stub().resolves(),
            query: sinon.stub()
                .onFirstCall().resolves()
                .onSecondCall().callsFake((...args) => {
                    if (args[0].toUpperCase().includes('SELECT')) {
                        return Promise.resolve({ command: 'SELECT', rows: ['abc', 'xyz'] })
                    }
                    if (args[0].toUpperCase().includes('INSERT')) {
                        return Promise.resolve({ command: 'INSERT', rowCount: 1 })
                    }
                    if (args[0].toUpperCase().includes('UPDATE')) {
                        return Promise.resolve({ command: 'UPDATE', rowCount: 3 })
                    }
                    if (args[0].toUpperCase().includes('DELETE')) {
                        return Promise.resolve({ command: 'DELETE', rowCount: 5 })
                    }
                    else return Promise.resolve({ command: args[0] });
                }),
        };
        client = mock as any as IPoolClient;
        transaction = new PersistenceTransaction(Promise.resolve(client));
    })

    describe('constructor', () => {
        it('should begin transaction', () => {
            return transaction.ready().then(() => {
                assert(mock.query.calledOnce, 'query should be called once but was called ' + mock.query.callCount + ' time(s)');
                assert(mock.query.calledWith('BEGIN'), `should be called with 'BEGIN'`);
            })
        })
    })

    describe('continue', () => {
        it('should forward correct parameters to database client', () => {
            const sql = 'SELECT name FROM test WHERE id = ?';
            const params = [ 'abcd' ];

            return transaction.ready()
                .then(() => transaction.continue(sql, params))
                .then(() => {
                    assert(mock.query.calledTwice, 'query should be called twice but was called ' + mock.query.callCount + ' time(s)');
                    assert(mock.query.getCall(1).args[0] === sql, `called with incorrect query: '${sql}'`);
                    assert(mock.query.getCall(1).args[1].join(', ') === params.join(', '), `called with incorrect params: '${params.join(`', '`)}'`);
                })
            ;
        })
        it('should throw exception if transaction is already complete', (done) => {
            const sql = 'SELECT name FROM test WHERE id = ?';
            const params = [ 'abcd' ];

            transaction.ready()
                .then(() => transaction.end(true))
                .then(() => transaction.continue(sql, params))
                .then(() => done(new Error('transaction should have failed')))
                .catch((error: Error) => {
                    if (error.message !== 'Database transaction already completed') {
                        done(new Error(`incorrect error message returned: '${error.message}'`));
                    } else {
                        done();
                    }
                })
            ;
        })
    })

    describe('end', () => {
        it('(commit = true) => should end transaction with a commit', () => {
            return transaction.end(true).then(() => {
                assert(mock.query.calledTwice, 'query should be called twice but was called ' + mock.query.callCount + ' time(s)');
                const secondCallArg = mock.query.getCall(1).args[0];
                assert(secondCallArg === 'COMMIT', `should be called with 'COMMIT' but was '${secondCallArg}'`);
            })
        })
        it('(commit = true) => should release a connection after a commit', () => {
            return transaction.end(true).then(() => {
                assert(mock.release.calledOnce, 'release should be called once but was called ' + mock.release.callCount + ' time(s)');
            })
        })
        it('(commit = true) => should throw exception if transaction is already complete', (done) => {
            transaction.ready()
                .then(() => transaction.end(true))
                .then(() => transaction.end(true))
                .then(() => done(new Error('transaction should have failed')))
                .catch((error: Error) => {
                    if (error.message !== 'Cannot COMMIT database transaction, transaction already completed') {
                        done(new Error(`incorrect error message returned: '${error.message}'`));
                    } else {
                        done();
                    }
                })
            ;
        })
        it('(commit = false) => should end transaction with a rollback', () => {
            return transaction.end(false).then(() => {
                assert(mock.query.calledTwice, 'query should be called twice but was called ' + mock.query.callCount + ' time(s)');
                const secondCallArg = mock.query.getCall(1).args[0];
                assert(secondCallArg === 'ROLLBACK', `should be called with 'ROLLBACK' but was '${secondCallArg}'`);
            })
        })
        it('(commit = false) => should release a connection after a rollback', () => {
            return transaction.end(false).then(() => {
                assert(mock.release.calledOnce, 'release should be called once but was called ' + mock.release.callCount + ' time(s)');
            })
        })
        it('(commit = false) => should throw exception if transaction is already complete', (done) => {
            transaction.ready()
                .then(() => transaction.end(false))
                .then(() => transaction.end(false))
                .then(() => done(new Error('transaction should have failed')))
                .catch((error: Error) => {
                    if (error.message !== 'Cannot ROLLBACK database transaction, transaction already completed') {
                        done(new Error(`incorrect error message returned: '${error.message}'`));
                    } else {
                        done();
                    }
                })
            ;
        })
    })

    describe('commit', () => {
        it('should end transaction with a commit', () => {
            return transaction.commit().then(() => {
                assert(mock.query.calledTwice, 'query should be called twice but was called ' + mock.query.callCount + ' time(s)');
                const secondCallArg = mock.query.getCall(1).args[0];
                assert(secondCallArg === 'COMMIT', `should be called with 'COMMIT' but was '${secondCallArg}'`);
            })
        })
        it('should release a connection after a commit', () => {
            return transaction.commit().then(() => {
                assert(mock.release.calledOnce, 'release should be called once but was called ' + mock.release.callCount + ' time(s)');
            })
        })
        it('should throw exception if transaction is already complete', (done) => {
            transaction.ready()
                .then(() => transaction.commit())
                .then(() => transaction.commit())
                .then(() => done(new Error('transaction should have failed')))
                .catch((error: Error) => {
                    if (error.message !== 'Cannot COMMIT database transaction, transaction already completed') {
                        done(new Error(`incorrect error message returned: '${error.message}'`));
                    } else {
                        done();
                    }
                })
            ;
        })
    })

    describe('rollback', () => {
        it('should end transaction with a rollback', () => {
            return transaction.rollback().then(() => {
                assert(mock.query.calledTwice, 'query should be called twice but was called ' + mock.query.callCount + ' time(s)');
                const secondCallArg = mock.query.getCall(1).args[0];
                assert(secondCallArg === 'ROLLBACK', `should be called with 'ROLLBACK' but was '${secondCallArg}'`);
            })
        })
        it('should release a connection after a rollback', () => {
            return transaction.rollback().then(() => {
                assert(mock.release.calledOnce, 'release should be called once but was called ' + mock.release.callCount + ' time(s)');
            })
        })
        it('should throw exception if transaction is already complete', (done) => {
            transaction.ready()
                .then(() => transaction.rollback())
                .then(() => transaction.rollback())
                .then(() => done(new Error('transaction should have failed')))
                .catch((error: Error) => {
                    if (error.message !== 'Cannot ROLLBACK database transaction, transaction already completed') {
                        done(new Error(`incorrect error message returned: '${error.message}'`));
                    } else {
                        done();
                    }
                })
            ;
        })
    })

    describe('isOpen', () => {
        it('should return true before query (connection not closed)', async () => {
            assert.strictEqual(await transaction.isOpen(), true);
        })
        it('should return true after query (connection not closed)', async () => {
            await transaction.continue('SELECT true');
            assert.strictEqual(await transaction.isOpen(), true);
        })
        it('should return false after commit', async () => {
            await transaction.commit();
            assert.strictEqual(await transaction.isOpen(), false);
        })
        it('should return false after rollback', async () => {
            await transaction.rollback();
            assert.strictEqual(await transaction.isOpen(), false);
        })
        it('should return false after end (commit = true)', async () => {
            await transaction.end(true);
            assert.strictEqual(await transaction.isOpen(), false);
        })
        it('should return false after end (commit = false)', async () => {
            await transaction.end(false);
            assert.strictEqual(await transaction.isOpen(), false);
        })
    })

    describe('closeIfOpen', () => {
        it('should close connection if one was open (commit = true)', async () => {
            assert.strictEqual(await transaction.isOpen(), true);
            await transaction.closeIfOpen(true);
            assert.strictEqual(await transaction.isOpen(), false);
            assert(mock.release.calledOnce, 'release should be called once but was called ' + mock.release.callCount + ' time(s)');
        })
        it('should close connection if one was open (commit = false)', async () => {
            assert.strictEqual(await transaction.isOpen(), true);
            await transaction.closeIfOpen(false);
            assert.strictEqual(await transaction.isOpen(), false);
            assert(mock.release.calledOnce, 'release should be called once but was called ' + mock.release.callCount + ' time(s)');
        })
        it('should not throw error if commit was already called', async () => {
            assert.strictEqual(await transaction.isOpen(), true);
            await transaction.commit();
            assert.strictEqual(await transaction.isOpen(), false);
            await transaction.closeIfOpen(true);
            assert.strictEqual(await transaction.isOpen(), false);
            assert(mock.release.calledOnce, 'release should be called once but was called ' + mock.release.callCount + ' time(s)');
        })
        it('should not throw error if rollback was already called', async () => {
            assert.strictEqual(await transaction.isOpen(), true);
            await transaction.rollback();
            assert.strictEqual(await transaction.isOpen(), false);
            await transaction.closeIfOpen(true);
            assert.strictEqual(await transaction.isOpen(), false);
            assert(mock.release.calledOnce, 'release should be called once but was called ' + mock.release.callCount + ' time(s)');
        })
    })

})
