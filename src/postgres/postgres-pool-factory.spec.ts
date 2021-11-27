import 'mocha';
import sinon, { SinonStub } from 'sinon';
import assert from 'assert';
import { IPersistenceConfig } from '../persistence/persistence-configuration.interface';
import { IPoolFactory } from '../persistence/pool-factory.interface';
import { PoolFactory } from './postgres-pool-factory';

describe('PoolFactory', () => {

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
        factory = new PoolFactory();
    })

    describe('makePool', () => {

        it('should throw exception if database is missing', (done) => {
            try {
                config.database = undefined;
                factory.makePool(config);
                done(new Error('Exception should have been thrown'));
            } catch (error) {
                assert.equal(error.message, 'Database not set');
                done();
            }
        })
        it('should throw exception if user is missing', (done) => {
            try {
                config.user = undefined;
                factory.makePool(config);
                done(new Error('Exception should have been thrown'));
            } catch (error) {
                assert.equal(error.message, 'Database user not set');
                done();
            }
        })
        it('should throw exception if password is missing', (done) => {
            try {
                config.password = undefined;
                factory.makePool(config);
                done(new Error('Exception should have been thrown'));
            } catch (error) {
                assert.equal(error.message, 'Database password not set');
                done();
            }
        })
        it('should throw exception if host is missing', (done) => {
            try {
                config.host = undefined;
                factory.makePool(config);
                done(new Error('Exception should have been thrown'));
            } catch (error) {
                assert.equal(error.message, 'Database host not set');
                done();
            }
        })
        it('should throw exception if port is missing', (done) => {
            try {
                config.port = undefined;
                factory.makePool(config);
                done(new Error('Exception should have been thrown'));
            } catch (error) {
                assert.equal(error.message, 'Database port not set');
                done();
            }
        })
    })
})
