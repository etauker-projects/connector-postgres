import { PersistenceService } from "../../src/persistence/persistence-service";

const tests = [
    {
        suite: 'suite 1',
        name: 'test 1',
        run: (service: PersistenceService) => (Promise.resolve({
            success: true,
            message: 'Executed successfully'
        }))
    },
    {
        suite: 'suite 2',
        name: 'test 2',
        run: (service: PersistenceService) => (Promise.resolve({
            success: false,
            message: 'Unsuccessful execution'
        }))
    },
    {
        suite: 'suite 1',
        name: 'test 2',
        run: (service: PersistenceService) => (Promise.reject('Rejected'))
    },
    {
        suite: 'suite 1',
        name: 'test 3',
        run: (service: PersistenceService) => (Promise.reject(new Error('Error thrown')))
    }
];

export { tests };