import 'mocha';
import { assert } from 'chai';
import { MySqlMock } from '../mysql/public';
import { BasePersistenceSingletonMock } from './BasePersistenceSingletonMock';
import { SystemConfigurationMock, DatabaseConfigurationMock } from '@etauker/utilities';
import { LoggerConfigurationMock } from '@etauker/utilities';
import { LoggerModes } from '@etauker/utilities';


describe('BasePersistenceSingletonMock', () => {

    const LOGGER_MODE: LoggerModes = 'ALL';
    let mysqlStub: MySqlMock;
    let system: SystemConfigurationMock;

    beforeEach(() => {
        mysqlStub = new MySqlMock();
        system = new SystemConfigurationMock({
            logger: new LoggerConfigurationMock({ mode: LOGGER_MODE }),
            database: new DatabaseConfigurationMock({ commit: true })
        });
    });

    afterEach(() => {
        mysqlStub.restore();
    });

    describe('constructor', () => {
        it('should use the correct parameters for pool creation', () => {
            const base = new BasePersistenceSingletonMock(system);
            assert.equal(mysqlStub.createPool.callCount, 1);
            assert(mysqlStub.createPool.alwaysCalledWithExactly({
                host    : system.getDatabaseConfig().getHost(),
                user    : system.getDatabaseConfig().getUser(),
                password: system.getDatabaseConfig().getPassword(),
                database: system.getDatabaseConfig().getDatabase(),
                port: system.getDatabaseConfig().getPort(),
                connectionLimit: system.getDatabaseConfig().getConnections()
            }));
        });
    });
    describe('static methods', () => {

        /*
        * A separate system configuration is needed here
        * because this config needas to persist across multiple tests
        * instead of being reset in before each.
        */
        let testSystemConfig: SystemConfigurationMock;
        let instance: BasePersistenceSingletonMock | undefined;

        before(() => {
            testSystemConfig = new SystemConfigurationMock({
                logger: new LoggerConfigurationMock({ mode: 'ALL' })
            });
            instance = BasePersistenceSingletonMock.getInstance(testSystemConfig);
        });

        it('should instantiate new class using the given constructor', () => {
            assert.deepEqual(instance.getConfig(), testSystemConfig.getDatabaseConfig());
        });
        it('should return existing instance on second call', () => {
            assert.equal(BasePersistenceSingletonMock.getInstance(testSystemConfig), instance);
        });
        it('should set existing instance to undefined', () => {
            BasePersistenceSingletonMock.resetInstance();
            assert.isUndefined(((BasePersistenceSingletonMock as any).instance));
        });
    })
    describe('all transactions', () => {
        it('should not query, commit or rollback on beginTransaction error', (done) => {
            mysqlStub.beginTransaction.rejects('error happened');

            const base = new BasePersistenceSingletonMock(system);
            base.insert('INSERT query').catch(() => {
                assert.equal(mysqlStub.query.callCount, 0);
                assert.equal(mysqlStub.commit.callCount, 0);
                assert.equal(mysqlStub.rollback.callCount, 0);
                assert.equal(mysqlStub.release.callCount, 1);
            }).then(done);
        });
        it('should rollback but not commit on query error', (done) => {
            mysqlStub.query.rejects('error happened');

            const base = new BasePersistenceSingletonMock(system);
            base.select('SELECT query').catch(() => {
                assert.equal(mysqlStub.commit.callCount, 0);
                assert.equal(mysqlStub.rollback.callCount, 1);
                assert.equal(mysqlStub.release.callCount, 1);
            }).then(done);
        });
        it('should still release on commit error', (done) => {
            mysqlStub.commit.rejects('error happened');

            const base = new BasePersistenceSingletonMock(system);
            base.update('UPDATE query').catch(() => {
                assert.equal(mysqlStub.rollback.callCount, 0);
                assert.equal(mysqlStub.release.callCount, 1);
            }).then(done);
        });
        it('should still release on rollback error', (done) => {
            mysqlStub.rollback.rejects('error happened');
            system.getDatabaseConfig().setCommit(false);
            const base = new BasePersistenceSingletonMock(system);
            base.delete('DELETE query').catch(() => {
                assert.equal(mysqlStub.commit.callCount, 0);
                assert.equal(mysqlStub.release.callCount, 1);
            }).then(done);
        });
        it('should rollback and not commit when configuration.commit = false', (done) => {
            system.getDatabaseConfig().setCommit(false);
            const base = new BasePersistenceSingletonMock(system);
            base.select('SELECT query').then(() => {
                assert.equal(mysqlStub.commit.callCount, 0);
                assert.equal(mysqlStub.rollback.callCount, 1);
                assert.equal(mysqlStub.release.callCount, 1);
                done();
            }).catch(done);

        });
    });
    describe('insert', () => {
        it('should call mysql.query and clean up connections', (done) => {
            const base = new BasePersistenceSingletonMock(system);
            base.insert('INSERT query').then(() => {
                assert.equal(mysqlStub.getConnection.callCount, 1);
                assert.equal(mysqlStub.beginTransaction.callCount, 1);
                assert.equal(mysqlStub.query.callCount, 1);
                assert.equal(mysqlStub.commit.callCount, 1);
                assert.equal(mysqlStub.rollback.callCount, 0);
                assert.equal(mysqlStub.release.callCount, 1);
                done();
            }).catch(done);
        });
    });
    describe('select', () => {
        it('should call mysql.query and clean up connections', (done) => {
            const base = new BasePersistenceSingletonMock(system);
            base.select('SELECT query').then(() => {
                assert.equal(mysqlStub.getConnection.callCount, 1);
                assert.equal(mysqlStub.beginTransaction.callCount, 1);
                assert.equal(mysqlStub.query.callCount, 1);
                assert.equal(mysqlStub.commit.callCount, 1);
                assert.equal(mysqlStub.rollback.callCount, 0);
                assert.equal(mysqlStub.release.callCount, 1);
                done();
            }).catch(done);
        });
    });
    describe('update', () => {
        it('should call mysql.query and clean up connections', (done) => {
            const base = new BasePersistenceSingletonMock(system);
            base.update('UPDATE query').then(() => {
                assert.equal(mysqlStub.getConnection.callCount, 1);
                assert.equal(mysqlStub.beginTransaction.callCount, 1);
                assert.equal(mysqlStub.query.callCount, 1);
                assert.equal(mysqlStub.commit.callCount, 1);
                assert.equal(mysqlStub.rollback.callCount, 0);
                assert.equal(mysqlStub.release.callCount, 1);
                done();
            }).catch(done);
        });
    });
    describe('delete', () => {
        it('should call mysql.query and clean up connections', (done) => {
            const base = new BasePersistenceSingletonMock(system);
            base.delete('DELETE query').then(() => {
                assert.equal(mysqlStub.getConnection.callCount, 1);
                assert.equal(mysqlStub.beginTransaction.callCount, 1);
                assert.equal(mysqlStub.query.callCount, 1);
                assert.equal(mysqlStub.commit.callCount, 1);
                assert.equal(mysqlStub.rollback.callCount, 0);
                assert.equal(mysqlStub.release.callCount, 1);
                done();
            }).catch(done);
        });
    });
});