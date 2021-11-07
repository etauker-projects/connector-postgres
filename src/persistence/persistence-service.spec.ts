import 'mocha';
import sinon, { SinonStub } from 'sinon';
import assert from 'assert';
import { IPersistenceClient } from './persistence-client.interface';
import { PersistenceTransaction } from './persistence-transaction';
import { IPersistenceConfig } from './persistence-configuration.interface';
import { PersistenceService } from './persistence-service';
import { IQueryConfig } from './query-configuration.interface';
import { IPoolFactory } from './pool-factory.interface';
import { PersistenceTransactionMock } from './persistence-transaction.mock';
import { PoolFactoryMock } from '../postgres/postgres-pool-factory.mock';

describe('PersistenceService', () => {

    let config: IPersistenceConfig;
    let factory: IPoolFactory
    beforeEach(() => {
        config = {
            database: 'database',
            user: 'user',
            password: 'password',
            host: 'host',
            port: 1234,
        }
        factory = new PoolFactoryMock();
    })

    describe('constructor', () => {

        it('should throw exception if database is missing', (done) => {
            try {
                config.database = undefined;
                const service = new PersistenceService(config, factory);
                done(new Error('Exception should have been thrown'));
            } catch (error) {
                assert.equal(error.message, 'Database not set');
                done();
            }
        })
        it('should throw exception if user is missing', (done) => {
            try {
                config.user = undefined;
                const service = new PersistenceService(config, factory);
                done(new Error('Exception should have been thrown'));
            } catch (error) {
                assert.equal(error.message, 'Database user not set');
                done();
            }
        })
        it('should throw exception if password is missing', (done) => {
            try {
                config.password = undefined;
                const service = new PersistenceService(config, factory);
                done(new Error('Exception should have been thrown'));
            } catch (error) {
                assert.equal(error.message, 'Database password not set');
                done();
            }
        })
        it('should throw exception if host is missing', (done) => {
            try {
                config.host = undefined;
                const service = new PersistenceService(config, factory);
                done(new Error('Exception should have been thrown'));
            } catch (error) {
                assert.equal(error.message, 'Database host not set');
                done();
            }
        })
        it('should throw exception if port is missing', (done) => {
            try {
                config.port = undefined;
                const service = new PersistenceService(config, factory);
                done(new Error('Exception should have been thrown'));
            } catch (error) {
                assert.equal(error.message, 'Database port not set');
                done();
            }
        })
    })

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
            service = new PersistenceService(config, new PoolFactoryMock());
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
        it('(maxStatements = 1) => should return results for 1 INSERT statement', () => {
            throw new Error('Test "(maxStatements = 1) => should return results for 1 INSERT statement" not implemented');
        })
        it('(maxStatements = 1) => should return results for 1 UPDATE statement', () => {
            throw new Error('Test "(maxStatements = 1) => should return results for 1 UPDATE statement" not implemented');
        })
        it('(maxStatements = 1) => should return results for 1 DELETE statement', () => {
            throw new Error('Test "(maxStatements = 1) => should return results for 1 DELETE statement" not implemented');
        })
        it('(maxStatements = 4) => should return combined results for 3 statement', () => {
            throw new Error('Test "(maxStatements = 4) => should return combined results for 3 statement" not implemented');
        })
        it('(maxStatements = 2) => should throw error for 3 statements', () => {
            throw new Error('Test "(maxStatements = 2) => should throw error for 3 statements" not implemented');
        })
        it('should throw exception for SELECT statement', () => {
            throw new Error('Test "should throw exception for SELECT statement" not implemented');
        })
        it('should close a connection on commit', () => {
            throw new Error('Test "should close a connection on commit" not implemented');
        })
        it('should close a connection on rollback', () => {
            throw new Error('Test "should close a connection on rollback" not implemented');
        })
        it('should connection on error', () => {
            throw new Error('Test "should connection on error" not implemented');
        })
    })

    describe('any', () => {
        it('(maxStatements = 1) => should return results for 1 INSERT statement', () => {
            throw new Error('Test "(maxStatements = 1) => should return results for 1 INSERT statement" not implemented');
        })
        it('(maxStatements = 1) => should return results for 1 SELECT statement', () => {
            throw new Error('Test "(maxStatements = 1) => should return results for 1 SELECT statement" not implemented');
        })
        it('(maxStatements = 1) => should return results for 1 UPDATE statement', () => {
            throw new Error('Test "(maxStatements = 1) => should return results for 1 UPDATE statement" not implemented');
        })
        it('(maxStatements = 1) => should return results for 1 DELETE statement', () => {
            throw new Error('Test "(maxStatements = 1) => should return results for 1 DELETE statement" not implemented');
        })
        it('(maxStatements = 1) => should return results for 1 CALL statement', () => {
            throw new Error('Test "(maxStatements = 1) => should return results for 1 CALL statement" not implemented');
        })
        it('(maxStatements = 1) => should return results for 1 ALTER statement', () => {
            throw new Error('Test "(maxStatements = 1) => should return results for 1 ALTER statement" not implemented');
        })
        it('(maxStatements = 1) => should return results for 1 DROP statement', () => {
            throw new Error('Test "(maxStatements = 1) => should return results for 1 DROP statement" not implemented');
        })
        it('(maxStatements = 3) => should return results for 3 statement', () => {
            throw new Error('Test "(maxStatements = 3) => should return results for 3 statement" not implemented');
        })
        it('(maxStatements = 1) => should throw error for 2 statements', () => {
            throw new Error('Test "(maxStatements = 1) => should throw error for 2 statements" not implemented');
        })
        it('should close a connection on commit', () => {
            throw new Error('Test "should close a connection on commit" not implemented');
        })
        it('should close a connection on rollback', () => {
            throw new Error('Test "should close a connection on rollback" not implemented');
        })
        it('should connection on error', () => {
            throw new Error('Test "should connection on error" not implemented');
        })
    })
})
