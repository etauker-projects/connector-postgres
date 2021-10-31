import 'mocha';
import sinon from 'sinon';
import assert from 'assert';
import { IPersistenceClient } from './persistence-client.interface';
import { PersistenceTransaction } from './persistence-transaction';

describe('PersistenceService', () => {

    beforeEach(() => {

    })

    describe('constructor', () => {
        it('should throw exception if database is missing', () => {
            
        })
        it('should throw exception if user is missing', () => {
            
        })
        it('should throw exception if password is missing', () => {
            
        })
        it('should throw exception if host is missing', () => {
            
        })
        it('should throw exception if port is missing', () => {
            
        })
    })

    describe('query', () => {
        it('(maxStatements = 1) => should return results for 1 SELECT statement', () => {
            
        })
        it('(maxStatements = 2) => should return results for 1 SELECT statement', () => {
            
        })
        it('(maxStatements = 2) => should return combined results for 2 SELECT statements', () => {
            
        })
        it('(maxStatements = 2) => should throw error for 3 SELECT statements', () => {
            
        })
        it('should throw exception from query other than SELECT', () => {
            
        })
        it('should not allow a commit', () => {
            
        })
        it('should close a connection on rollback', () => {
            
        })
        it('should connection on error', () => {
            
        })
    })

    describe('execute', () => {
        it('(maxStatements = 1) => should return results for 1 INSERT statement', () => {
            
        })
        it('(maxStatements = 1) => should return results for 1 UPDATE statement', () => {
            
        })
        it('(maxStatements = 1) => should return results for 1 DELETE statement', () => {
            
        })
        it('(maxStatements = 4) => should return combined results for 3 statement', () => {
            
        })
        it('(maxStatements = 2) => should throw error for 3 statements', () => {
            
        })
        it('should throw exception for SELECT statement', () => {
            
        })
        it('should close a connection on commit', () => {
            
        })
        it('should close a connection on rollback', () => {
            
        })
        it('should connection on error', () => {
            
        })
    })

    describe('any', () => {
        it('(maxStatements = 1) => should return results for 1 INSERT statement', () => {
            
        })
        it('(maxStatements = 1) => should return results for 1 SELECT statement', () => {
            
        })
        it('(maxStatements = 1) => should return results for 1 UPDATE statement', () => {
            
        })
        it('(maxStatements = 1) => should return results for 1 DELETE statement', () => {
            
        })
        it('(maxStatements = 1) => should return results for 1 CALL statement', () => {
            
        })
        it('(maxStatements = 1) => should return results for 1 ALTER statement', () => {
            
        })
        it('(maxStatements = 1) => should return results for 1 DROP statement', () => {
            
        })
        it('(maxStatements = 3) => should return results for 3 statement', () => {
            
        })
        it('(maxStatements = 1) => should throw error for 2 statements', () => {
            
        })
        it('should close a connection on commit', () => {
            
        })
        it('should close a connection on rollback', () => {
            
        })
        it('should connection on error', () => {
            
        })
    })
})
