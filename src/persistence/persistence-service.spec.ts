import 'mocha';
import sinon, { SinonStub } from 'sinon';
import assert, { fail } from 'assert';
import { PersistenceTransaction } from './persistence-transaction';
import { IPersistenceConfig } from './persistence-configuration.interface';
import { PersistenceService } from './persistence-service';
import { PersistenceTransactionMock } from './persistence-transaction.mock';
import { PoolFactoryMock } from '../postgres/postgres-pool-factory.mock';


describe('PersistenceService', () => {

    const INSERT_STATEMENT = 'INSERT something INTO mock;';
    const SELECT_STATEMENT = 'SELECT * FROM mock;';
    const UPDATE_STATEMENT = `UPDATE example SET name = 'New Name';`;
    const DELETE_STATEMENT = 'DELETE FROM example;';

    describe('select', () => {

        let config: IPersistenceConfig;
        let service: PersistenceService;
        let transaction: PersistenceTransaction;
        let stub: sinon.SinonStub;

        beforeEach(() => {
            config = {
                database: 'database',
                user: 'user',
                password: 'password',
                host: 'host',
                port: 1234,
            }
            transaction = PersistenceTransactionMock.getInstance();
            const factory = new PoolFactoryMock();
            service = new PersistenceService(factory.makePool(config));
            stub = sinon.stub(service, 'transact').returns(transaction);
        })

        it('should throw exception for 1 INSERT statements', () => {
            const sql = INSERT_STATEMENT;
            return service.select(sql, [])
                .then(results => fail(new Error('Error should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, `Select method can only be used for 'SELECT' statements`);
                })
            ;
        })

        it('should return results for 1 SELECT statement', () => {
            const sql = SELECT_STATEMENT;
            return service.select(sql, []).then(result => {
                assert.equal(result.length, 1);
                assert.equal((transaction.continue as SinonStub).callCount, 1);
            });
        })

        it('should throw exception for 1 UPDATE statements', () => {
            const sql = UPDATE_STATEMENT;
            return service.select(sql, [])
                .then(results => fail(new Error('Error should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, `Select method can only be used for 'SELECT' statements`);
                })
            ;
        })

        it('should throw exception for 1 DELETE statements', () => {
            const sql = DELETE_STATEMENT;
            return service.select(sql, [])
                .then(results => fail(new Error('Error should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, `Select method can only be used for 'SELECT' statements`);
                })
            ;
        })

        it('should throw exception for 2 SELECT statements', () => {
            const sql = "SELECT * FROM mock; SELECT * FROM mock;";
            return service.select(sql, [])
                .then(results => fail(new Error('Error should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, `SQL query count exceeds allowed count. 2 queries provided, maximum allowed is 1`);
                })
            ;
        })

        it('should close a connection on rollback', () => {
            const sql = SELECT_STATEMENT;
            return service.select(sql, []).then(result => {
                assert.equal(result.length, 1);
                assert((transaction.end as SinonStub).calledOnceWith(false));

            });
        })

        it('should close connection on error', () => {
            const sql = SELECT_STATEMENT;
            const message = 'Something unexpected happened';
            (transaction.continue as SinonStub).throws(new Error(message));

            return service.select(sql, [])
                .then(result => fail(new Error('Exception should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, message);
                    assert((transaction.end as SinonStub).calledOnceWith(false));
                })
            ;
        })
    })

    // describe('execute', () => {

    //     let config: IPersistenceConfig;
    //     let service: PersistenceService;
    //     let transaction: PersistenceTransaction;
    //     let stub: sinon.SinonStub;

    //     beforeEach(() => {
    //         config = {
    //             database: 'database',
    //             user: 'user',
    //             password: 'password',
    //             host: 'host',
    //             port: 1234,
    //         }
    //         transaction = PersistenceTransactionMock.getInstance();
    //         const factory = new PoolFactoryMock();
    //         service = new PersistenceService(factory.makePool(config));
    //         stub = sinon.stub(service, 'transact').returns(transaction);
    //     })

    //     it('(maxStatements = 1) => should return results for 1 INSERT statement', () => {
    //         const name = 'Some Name';
    //         const id = randomUUID();
    //         const query = `INSERT INTO example (id, name) VALUES ('${id}'', '${name}');`;
    //         return service
    //             .execute(query, [], { commit: false })
    //             .then(result => assert.equal(result, 1, 'incorrect number of items created'))
    //         ;
    //     })
    //     it('(maxStatements = 1) => should return results for 1 UPDATE statement', () => {
    //         const name = 'Some Name';
    //         const id = randomUUID();
    //         const query = `UPDATE example SET id = '${id}', name = '${name}';`;
    //         return service
    //             .execute(query, [], { commit: false })
    //             .then(result => assert.equal(result, 1, 'incorrect number of items updated'))
    //         ;
    //     })
    //     it('(maxStatements = 1) => should return results for 1 DELETE statement', () => {
    //         const id = randomUUID();
    //         const query = `DELETE FROM example WHERE id = '${id}';`;
    //         return service
    //             .execute(query, [], { commit: false })
    //             .then(result => assert.equal(result, 1, 'incorrect number of items deleted'))
    //         ;
    //     })
    //     // note: not yet supported
    //     xit('(maxStatements = 4) => should return combined results for 3 statement', () => {
    //         throw new Error('Test "(maxStatements = 4) => should return combined results for 3 statement" not implemented');
    //     })
    //     // note: not yet supported
    //     xit('(maxStatements = 2) => should throw error for 3 statements', () => {
    //         throw new Error('Test "(maxStatements = 2) => should throw error for 3 statements" not implemented');
    //     })
    //     it('should throw exception for SELECT statement', (done) => {
    //         const query = `SELECT * FROM example;`;
    //         const expected = `Execute method can only be used for 'INSERT', 'UPDATE', 'DELETE' statements`;
    //         service
    //             .execute(query)
    //             .then(result => done('exception should have been thrown'))
    //             .catch(error => {
    //                 assert.equal(error.message, expected);
    //                 done();
    //             })
    //         ;
    //     })
    //     // TODO: test on transaction level
    //     xit('should close a connection on commit', () => {
    //         throw new Error('Test "should close a connection on commit" not implemented');
    //     })
    //     // TODO: test on transaction level
    //     xit('should close a connection on rollback', () => {
    //         throw new Error('Test "should close a connection on rollback" not implemented');
    //     })
    //     // TODO: test on transaction level
    //     xit('should close connection on error', () => {
    //         throw new Error('Test "should connection on error" not implemented');
    //     })
    // })

    // describe('any', () => {

    //     let config: IPersistenceConfig;
    //     let service: PersistenceService;
    //     let transaction: PersistenceTransaction;
    //     let stub: sinon.SinonStub;

    //     beforeEach(() => {
    //         config = {
    //             database: 'database',
    //             user: 'user',
    //             password: 'password',
    //             host: 'host',
    //             port: 1234,
    //         }
    //         transaction = PersistenceTransactionMock.getInstance();
    //         const factory = new PoolFactoryMock();
    //         service = new PersistenceService(factory.makePool(config));
    //         stub = sinon.stub(service, 'transact').returns(transaction);
    //     })

    //     it('(maxStatements = 1) => should return results for 1 INSERT statement', () => {
    //         const name = 'Some Name';
    //         const id = randomUUID();
    //         const query = `INSERT INTO example (id, name) VALUES ('${id}'', '${name}');`;
    //         return service
    //             .any(query, [])
    //             .then(result => assert.equal(result, 1, 'incorrect number of items created'))
    //         ;
    //     })
    //     it('(maxStatements = 1) => should return results for 1 SELECT statement', () => {
    //         const query = `SELECT * FROM example;`;
    //         return service
    //             .any(query, [])
    //             .then(result => assert.equal(result, 1, 'incorrect number of items selected'))
    //         ;
    //     })
    //     it('(maxStatements = 1) => should return results for 1 UPDATE statement', () => {
    //         const name = 'Some Name';
    //         const id = randomUUID();
    //         const query = `UPDATE example SET id = '${id}', name = '${name}';`;
    //         return service
    //             .any(query, [])
    //             .then(result => assert.equal(result, 1, 'incorrect number of items updated'))
    //         ;
    //     })
    //     it('(maxStatements = 1) => should return results for 1 DELETE statement', () => {
    //         const id = randomUUID();
    //         const query = `DELETE FROM example WHERE id = '${id}';`;
    //         return service
    //             .any(query, [])
    //             .then(result => assert.equal(result, 1, 'incorrect number of items deleted'))
    //         ;
    //     })
    //     it('(maxStatements = 1) => should return results for 1 CALL statement', () => {
    //         const id = randomUUID();
    //         const query = `CALL someDatabaseFunction('parameter');`;
    //         return service
    //             .any(query, [])
    //             .then(result => assert.equal(result, 1, 'incorrect number of items deleted'))
    //         ;
    //     })
    //     it('(maxStatements = 1) => should return results for 1 ALTER statement', () => {
    //         const query = `ALTER TABLE example DROP COLUMN name;`;
    //         return service
    //             .any(query, [])
    //             .then(result => assert.equal(result, 1, 'incorrect number statements executed'))
    //         ;
    //     })
    //     it('(maxStatements = 1) => should return results for 1 DROP statement', () => {
    //         const query = `DROP TABLE example;`;
    //         return service
    //             .any(query, [])
    //             .then(result => assert.equal(result, 1, 'incorrect number statements executed'))
    //         ;
    //     })
    //     // note: not yet supported
    //     xit('(maxStatements = 3) => should return results for 3 statement', () => {
    //         throw new Error('Test "(maxStatements = 3) => should return results for 3 statement" not implemented');
    //     })
    //     // note: not yet supported
    //     xit('(maxStatements = 1) => should throw error for 2 statements', () => {
    //         throw new Error('Test "(maxStatements = 1) => should throw error for 2 statements" not implemented');
    //     })
    //     // TODO: test on transaction level
    //     xit('should close a connection on commit', () => {
    //         throw new Error('Test "should close a connection on commit" not implemented');
    //     })
    //     // TODO: test on transaction level
    //     xit('should close a connection on rollback', () => {
    //         throw new Error('Test "should close a connection on rollback" not implemented');
    //     })
    //     // TODO: test on transaction level
    //     xit('should close connection on error', () => {
    //         throw new Error('Test "should connection on error" not implemented');
    //     })
    // })
})
