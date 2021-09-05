import { IPersistenceService } from '../../src/persistence/persistence-service.interface';

const tests = [
    {
        suite: 'suite 1',
        name: 'test 1',
        run: (service: IPersistenceService) => (Promise.resolve({
            success: true,
            message: 'Executed successfully'
        }))
    },
    {
        suite: 'suite 2',
        name: 'test 2',
        run: (service: IPersistenceService) => (Promise.resolve({
            success: false,
            message: 'Unsuccessful execution'
        }))
    },
    {
        suite: 'suite 1',
        name: 'test 2',
        run: (service: IPersistenceService) => (Promise.reject('Rejected'))
    },
    {
        suite: 'suite 1',
        name: 'test 3',
        run: (service: IPersistenceService) => (Promise.reject(new Error('Error thrown')))
    }
];

export { tests };