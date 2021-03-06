import { PersistenceConnector } from "../../src";

const tests = [
    {
        suite: 'suite 1',
        name: 'test 1',
        run: (connector: PersistenceConnector) => (Promise.resolve({
            success: true,
            message: 'Executed successfully'
        }))
    },
    {
        suite: 'suite 2',
        name: 'test 2',
        run: (connector: PersistenceConnector) => (Promise.resolve({
            success: false,
            message: 'Unsuccessful execution'
        }))
    },
    {
        suite: 'suite 1',
        name: 'test 2',
        run: (connector: PersistenceConnector) => (Promise.reject('Rejected'))
    },
    {
        suite: 'suite 1',
        name: 'test 3',
        run: (connector: PersistenceConnector) => (Promise.reject(new Error('Error thrown')))
    }
];

export { tests };