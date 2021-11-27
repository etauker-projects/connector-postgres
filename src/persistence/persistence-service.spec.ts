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

    describe('insert', () => {

        it('should return correct affected row count for 1 INSERT statement', () => {
            const sql = INSERT_STATEMENT;
            return service.insert(sql, []).then(result => {
                assert.equal(result, 1);
                assert.equal((transaction.continue as SinonStub).callCount, 1);
            });
        })

        it('should throw exception for 1 SELECT statement', () => {
            const sql = SELECT_STATEMENT;
            return service.insert(sql, [])
                .then(results => fail(new Error('Error should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, `Insert method can only be used for 'INSERT' statements`);
                })
            ;
        })

        it('should throw exception for 1 UPDATE statement', () => {
            const sql = UPDATE_STATEMENT;
            return service.insert(sql, [])
                .then(results => fail(new Error('Error should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, `Insert method can only be used for 'INSERT' statements`);
                })
            ;
        })

        it('should throw exception for 1 DELETE statement', () => {
            const sql = DELETE_STATEMENT;
            return service.insert(sql, [])
                .then(results => fail(new Error('Error should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, `Insert method can only be used for 'INSERT' statements`);
                })
            ;
        })

        it('should throw exception for 2 INSERT statements', () => {
            const sql = `${INSERT_STATEMENT} ${INSERT_STATEMENT}`;
            return service.insert(sql, [])
                .then(results => fail(new Error('Error should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, `SQL statement count exceeds allowed count. 2 statements provided, maximum allowed is 1`);
                })
            ;
        })

        it('should close a connection on commit', () => {
            const sql = INSERT_STATEMENT;
            return service.insert(sql, [], { commit: true }).then(result => {
                assert.equal(result, 1);
                assert((transaction.end as SinonStub).calledOnceWith(true));

            });
        })

        it('should close a connection on rollback', () => {
            const sql = INSERT_STATEMENT;
            return service.insert(sql, [], { commit: false }).then(result => {
                assert.equal(result, 1);
                assert((transaction.end as SinonStub).calledOnceWith(false));

            });
        })

        it('should close connection on error', () => {
            const sql = INSERT_STATEMENT;
            const message = 'Something unexpected happened';
            (transaction.continue as SinonStub).throws(new Error(message));

            return service.insert(sql, [])
                .then(result => fail(new Error('Exception should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, message);
                    assert((transaction.end as SinonStub).calledOnceWith(false));
                })
            ;
        })
    })

    describe('select', () => {

        it('should throw exception for 1 INSERT statement', () => {
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

        it('should throw exception for 1 UPDATE statement', () => {
            const sql = UPDATE_STATEMENT;
            return service.select(sql, [])
                .then(results => fail(new Error('Error should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, `Select method can only be used for 'SELECT' statements`);
                })
            ;
        })

        it('should throw exception for 1 DELETE statement', () => {
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
                    assert.equal(error.message, `SQL statement count exceeds allowed count. 2 statements provided, maximum allowed is 1`);
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

    describe('update', () => {

        it('should throw exception for 1 INSERT statement', () => {
            const sql = INSERT_STATEMENT;
            return service.update(sql, [])
                .then(results => fail(new Error('Error should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, `Update method can only be used for 'UPDATE' statements`);
                })
            ;
        })

        it('should throw exception for 1 SELECT statement', () => {
            const sql = SELECT_STATEMENT;
            return service.update(sql, [])
                .then(results => fail(new Error('Error should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, `Update method can only be used for 'UPDATE' statements`);
                })
            ;
        })

        it('should return correct affected row count for 1 UPDATE statement', () => {
            const sql = UPDATE_STATEMENT;
            return service.update(sql, []).then(result => {
                assert.equal(result, 1);
                assert.equal((transaction.continue as SinonStub).callCount, 1);
            });
        })

        it('should throw exception for 1 DELETE statement', () => {
            const sql = DELETE_STATEMENT;
            return service.update(sql, [])
                .then(results => fail(new Error('Error should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, `Update method can only be used for 'UPDATE' statements`);
                })
            ;
        })

        it('should throw exception for 2 UPDATE statements', () => {
            const sql = `${INSERT_STATEMENT} ${INSERT_STATEMENT}`;
            return service.update(sql, [])
                .then(results => fail(new Error('Error should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, `SQL statement count exceeds allowed count. 2 statements provided, maximum allowed is 1`);
                })
            ;
        })

        it('should close a connection on commit', () => {
            const sql = UPDATE_STATEMENT;
            return service.update(sql, [], { commit: true }).then(result => {
                assert.equal(result, 1);
                assert((transaction.end as SinonStub).calledOnceWith(true));

            });
        })

        it('should close a connection on rollback', () => {
            const sql = UPDATE_STATEMENT;
            return service.update(sql, [], { commit: false }).then(result => {
                assert.equal(result, 1);
                assert((transaction.end as SinonStub).calledOnceWith(false));

            });
        })

        it('should close connection on error', () => {
            const sql = UPDATE_STATEMENT;
            const message = 'Something unexpected happened';
            (transaction.continue as SinonStub).throws(new Error(message));

            return service.update(sql, [])
                .then(result => fail(new Error('Exception should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, message);
                    assert((transaction.end as SinonStub).calledOnceWith(false));
                })
            ;
        })
    })

    describe('delete', () => {

        it('should throw exception for 1 INSERT statement', () => {
            const sql = INSERT_STATEMENT;
            return service.delete(sql, [])
                .then(results => fail(new Error('Error should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, `Delete method can only be used for 'DELETE' statements`);
                })
            ;
        })

        it('should throw exception for 1 SELECT statement', () => {
            const sql = SELECT_STATEMENT;
            return service.delete(sql, [])
                .then(results => fail(new Error('Error should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, `Delete method can only be used for 'DELETE' statements`);
                })
            ;
        })

        it('should throw exception for 1 UPDATE statement', () => {
            const sql = UPDATE_STATEMENT;
            return service.delete(sql, [])
                .then(results => fail(new Error('Error should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, `Delete method can only be used for 'DELETE' statements`);
                })
            ;
        })

        it('should return correct affected row count for 1 DELETE statement', () => {
            const sql = DELETE_STATEMENT;
            return service.delete(sql, []).then(result => {
                assert.equal(result, 1);
                assert.equal((transaction.continue as SinonStub).callCount, 1);
            });
        })

        it('should throw exception for 2 DELETE statements', () => {
            const sql = `${DELETE_STATEMENT} ${DELETE_STATEMENT}`;
            return service.delete(sql, [])
                .then(results => fail(new Error('Error should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, `SQL statement count exceeds allowed count. 2 statements provided, maximum allowed is 1`);
                })
            ;
        })

        it('should close a connection on commit', () => {
            const sql = DELETE_STATEMENT;
            return service.delete(sql, [], { commit: true }).then(result => {
                assert.equal(result, 1);
                assert((transaction.end as SinonStub).calledOnceWith(true));

            });
        })

        it('should close a connection on rollback', () => {
            const sql = DELETE_STATEMENT;
            return service.delete(sql, [], { commit: false }).then(result => {
                assert.equal(result, 1);
                assert((transaction.end as SinonStub).calledOnceWith(false));

            });
        })

        it('should close connection on error', () => {
            const sql = DELETE_STATEMENT;
            const message = 'Something unexpected happened';
            (transaction.continue as SinonStub).throws(new Error(message));

            return service.delete(sql, [])
                .then(result => fail(new Error('Exception should have been thrown')))
                .catch(error => {
                    assert.equal(error.message, message);
                    assert((transaction.end as SinonStub).calledOnceWith(false));
                })
            ;
        })
    })
})
