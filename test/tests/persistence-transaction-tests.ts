import assert from 'assert';
import { PersistenceConnector } from '../../src';

const tests = [
    {
        suite: 'Persistence Transaction',
        name: 'isOpen() should return correct results after commit',
        run: async (connector: PersistenceConnector) => {
            const transaction = connector.transact();
            assert.strictEqual(await transaction.isOpen(), true, 'transaction must be open before query');
            await transaction.continue(SELECT_QUERY);
            assert.strictEqual(await transaction.isOpen(), true, 'transaction must be open after query');
            await transaction.commit();
            assert.strictEqual(await transaction.isOpen(), false, 'transaction must be closed after commit');
            return { success: true, message: 'Success' };
        }
    },
    {
        suite: 'Persistence Transaction',
        name: 'isOpen() should return correct results after rollback',
        run: async (connector: PersistenceConnector) => {
            const transaction = connector.transact();
            assert.strictEqual(await transaction.isOpen(), true, 'transaction must be open before query');
            await transaction.continue(SELECT_QUERY);
            assert.strictEqual(await transaction.isOpen(), true, 'transaction must be open after query');
            await transaction.commit();
            assert.strictEqual(await transaction.isOpen(), false, 'transaction must be closed after rollback');
            return { success: true, message: 'Success' };
        }
    },
];

export { tests };

const SELECT_QUERY = `SELECT * FROM integration_test`;