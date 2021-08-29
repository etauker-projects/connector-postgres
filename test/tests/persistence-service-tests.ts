import assert from 'assert';
import { IPersistenceService } from '../../src/persistence/persistence-service.interface';

// TODO:
// - implement migrations
// - run migration to create integration test table
// - read from the table
// - insert into the table
// - read from the table
// - update the entry
// - read from the table
// - delete from the table
// - read from the table

const tests = [   
    {
        suite: 'Persistence Service',
        name: 'should return correct results on select',
        run: async (service: IPersistenceService) => {
            const query = 'SELECT 1 AS value';
            const result = await service.query(query);
            assert.equal(result.created, 0, 'incorrect created');
            assert.equal(result.deleted, 0, 'incorrect deleted');
            assert.equal(result.updated, 0, 'incorrect updated');
            assert.equal(result.results.length, 1, 'incorrect result count');
            assert.deepStrictEqual(result.results, [{ value: 1}], 'incorrect result count');
            return { success: true, message: 'Success' };
        }
    }
];

export { tests };