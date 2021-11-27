import 'mocha';
import sinon, { SinonStub } from 'sinon';
import assert from 'assert';
import { PersistenceTransaction } from './persistence-transaction';
import { IPersistenceConfig } from './persistence-configuration.interface';
import { PersistenceService } from './persistence-service';
import { IQueryConfig } from './query-configuration.interface';
import { PersistenceTransactionMock } from './persistence-transaction.mock';
import { PoolFactoryMock } from '../postgres/postgres-pool-factory.mock';
import { randomUUID } from 'crypto';

describe('PersistenceService', () => {

    describe('query', () => {

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

        it('(maxStatements = 1) => should return results for 1 SELECT statement', () => {
            const sql = "SELECT * FROM mock;";
            const requestConfig: Partial<IQueryConfig> = { maxStatements: 1 }
            return service.query(sql, [], requestConfig).then(result => {
                assert.equal(result.length, 1);
                assert.equal((transaction.continue as SinonStub).callCount, 1);
            });
        })
        it('(maxStatements = 2) => should return results for 1 SELECT statement', () => {
            const sql = "SELECT * FROM mock;";
            const requestConfig: Partial<IQueryConfig> = { maxStatements: 2 }
            return service.query(sql, [], requestConfig).then(result => {
                assert.equal(result.length, 1);
                assert.equal((transaction.continue as SinonStub).callCount, 1);
            });
        })
        it('(maxStatements = 2) => should return combined results for 2 SELECT statements', () => {
            const sql = "SELECT * FROM mock; SELECT * FROM another";
            const requestConfig: Partial<IQueryConfig> = { maxStatements: 2 }
            return service.query(sql, [], requestConfig).then(result => {
                assert.equal(result.length, 2);
                assert.equal((transaction.continue as SinonStub).callCount, 2);
            });
        })
        it('(maxStatements = 2) => should throw error for 3 SELECT statements', (done) => {
            const sql = "SELECT * FROM mock; SELECT * FROM another;  SELECT * FROM third";
            const requestConfig: Partial<IQueryConfig> = { maxStatements: 2 }
            service.query(sql, [], requestConfig)
                .then(result => done(new Error('Error should have been thrown')))
                .catch((error) => {
                    assert.equal(error.message, 'SQL query count exceeds allowed count. 3 queries provided, maximum allowed is 2');
                    done()
                })
            ;
        })
        it('should throw exception from query other than SELECT', (done) => {
            const sql = "INSERT something INTO mock;";
            const requestConfig: Partial<IQueryConfig> = { maxStatements: 1 }
            service.query(sql, [], requestConfig)
                .then(result => done(new Error('Error should have been thrown')))
                .catch((error) => {
                    assert.equal(error.message, "Query method can only be used for 'SELECT' statements");
                    done()
                })
            ;
        })
        it('should not allow a commit', () => {
            const sql = "SELECT * FROM mock;";
            const requestConfig: Partial<IQueryConfig> = { commit: true }
            return service.query(sql, [], requestConfig).then(result => {
                assert.equal(result.length, 1);
                assert((transaction.end as SinonStub).calledOnceWith(false));
            });
        })

        // TODO: test on transaction level
        xit('should close a connection on rollback', () => {
            const sql = "INSERT something INTO mock;";
            const requestConfig: Partial<IQueryConfig> = { commit: false }
            return service.query(sql, [], requestConfig).then(result => {
                assert.equal(result, 1);
                assert((transaction.end as SinonStub).calledOnceWith(false));

            });
        })

        // TODO: test on transaction level
        xit('should close connection on error', () => {
            throw new Error('Test "should connection on error" not implemented');
        })
    })

    describe('execute', () => {

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

        it('(maxStatements = 1) => should return results for 1 INSERT statement', () => {
            const name = 'Some Name';
            const id = randomUUID();
            const query = `INSERT INTO example (id, name) VALUES ('${id}'', '${name}');`;
            return service
                .execute(query, [], { commit: false })
                .then(result => assert.equal(result, 1, 'incorrect number of items created'))
            ;
        })
        it('(maxStatements = 1) => should return results for 1 UPDATE statement', () => {
            const name = 'Some Name';
            const id = randomUUID();
            const query = `UPDATE example SET id = '${id}', name = '${name}';`;
            return service
                .execute(query, [], { commit: false })
                .then(result => assert.equal(result, 1, 'incorrect number of items updated'))
            ;
        })
        it('(maxStatements = 1) => should return results for 1 DELETE statement', () => {
            const id = randomUUID();
            const query = `DELETE FROM example WHERE id = '${id}';`;
            return service
                .execute(query, [], { commit: false })
                .then(result => assert.equal(result, 1, 'incorrect number of items deleted'))
            ;
        })
        // note: not yet supported
        xit('(maxStatements = 4) => should return combined results for 3 statement', () => {
            throw new Error('Test "(maxStatements = 4) => should return combined results for 3 statement" not implemented');
        })
        // note: not yet supported
        xit('(maxStatements = 2) => should throw error for 3 statements', () => {
            throw new Error('Test "(maxStatements = 2) => should throw error for 3 statements" not implemented');
        })
        it('should throw exception for SELECT statement', (done) => {
            const query = `SELECT * FROM example;`;
            const expected = `Execute method can only be used for 'INSERT', 'UPDATE', 'DELETE' statements`;
            service
                .execute(query)
                .then(result => done('exception should have been thrown'))
                .catch(error => {
                    assert.equal(error.message, expected);
                    done();
                })
            ;
        })
        // TODO: test on transaction level
        xit('should close a connection on commit', () => {
            throw new Error('Test "should close a connection on commit" not implemented');
        })
        // TODO: test on transaction level
        xit('should close a connection on rollback', () => {
            throw new Error('Test "should close a connection on rollback" not implemented');
        })
        // TODO: test on transaction level
        xit('should close connection on error', () => {
            throw new Error('Test "should connection on error" not implemented');
        })
    })

    describe('any', () => {

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

        it('(maxStatements = 1) => should return results for 1 INSERT statement', () => {
            const name = 'Some Name';
            const id = randomUUID();
            const query = `INSERT INTO example (id, name) VALUES ('${id}'', '${name}');`;
            return service
                .any(query, [])
                .then(result => assert.equal(result, 1, 'incorrect number of items created'))
            ;
        })
        it('(maxStatements = 1) => should return results for 1 SELECT statement', () => {
            const query = `SELECT * FROM example;`;
            return service
                .any(query, [])
                .then(result => assert.equal(result, 1, 'incorrect number of items selected'))
            ;
        })
        it('(maxStatements = 1) => should return results for 1 UPDATE statement', () => {
            const name = 'Some Name';
            const id = randomUUID();
            const query = `UPDATE example SET id = '${id}', name = '${name}';`;
            return service
                .any(query, [])
                .then(result => assert.equal(result, 1, 'incorrect number of items updated'))
            ;
        })
        it('(maxStatements = 1) => should return results for 1 DELETE statement', () => {
            const id = randomUUID();
            const query = `DELETE FROM example WHERE id = '${id}';`;
            return service
                .any(query, [])
                .then(result => assert.equal(result, 1, 'incorrect number of items deleted'))
            ;
        })
        it('(maxStatements = 1) => should return results for 1 CALL statement', () => {
            const id = randomUUID();
            const query = `CALL someDatabaseFunction('parameter');`;
            return service
                .any(query, [])
                .then(result => assert.equal(result, 1, 'incorrect number of items deleted'))
            ;
        })
        it('(maxStatements = 1) => should return results for 1 ALTER statement', () => {
            const query = `ALTER TABLE example DROP COLUMN name;`;
            return service
                .any(query, [])
                .then(result => assert.equal(result, 1, 'incorrect number statements executed'))
            ;
        })
        it('(maxStatements = 1) => should return results for 1 DROP statement', () => {
            const query = `DROP TABLE example;`;
            return service
                .any(query, [])
                .then(result => assert.equal(result, 1, 'incorrect number statements executed'))
            ;
        })
        // note: not yet supported
        xit('(maxStatements = 3) => should return results for 3 statement', () => {
            throw new Error('Test "(maxStatements = 3) => should return results for 3 statement" not implemented');
        })
        // note: not yet supported
        xit('(maxStatements = 1) => should throw error for 2 statements', () => {
            throw new Error('Test "(maxStatements = 1) => should throw error for 2 statements" not implemented');
        })
        // TODO: test on transaction level
        xit('should close a connection on commit', () => {
            throw new Error('Test "should close a connection on commit" not implemented');
        })
        // TODO: test on transaction level
        xit('should close a connection on rollback', () => {
            throw new Error('Test "should close a connection on rollback" not implemented');
        })
        // TODO: test on transaction level
        xit('should close connection on error', () => {
            throw new Error('Test "should connection on error" not implemented');
        })
    })
})
