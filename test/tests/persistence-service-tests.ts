import assert from 'assert';
import { PersistenceService } from '../../src/persistence/persistence-service';

const tests = [
    {
        suite: 'Persistence Service',
        name: 'select should return correct results',
        run: async (service: PersistenceService) => {
            const query = SELECT_QUERY;
            const result = await service.select(query);
            assert.equal(result.length, 0, 'incorrect result count');
            assert.deepStrictEqual(result, [], 'incorrect results');
            return { success: true, message: 'Success' };
        }
    },
    {
        suite: 'Persistence Service',
        name: 'insert should return correct row count',
        run: async (service: PersistenceService) => {
            const query = INSERT_QUERY;
            const result = await service.execute(query);
            assert.equal(result, 1, 'incorrect inserted');
            return { success: true, message: 'Success' };
        }
    },
    {
        suite: 'Persistence Service',
        name: 'select should return correct results after insert',
        run: async (service: PersistenceService) => {
            const query = SELECT_QUERY;
            const result = await service.select(query);
            assert.equal(result.length, 1, 'incorrect result count');
            assert.deepStrictEqual(result, [INSERTED], 'incorrect results');
            return { success: true, message: 'Success' };
        }
    },
    {
        suite: 'Persistence Service',
        name: 'insert should fail when unique column is not unique',
        run: async (service: PersistenceService) => {
            try {
                await service.execute(INSERT_NOT_UNIQUE_QUERY);
                return { success: false, message: 'Error should have been thrown due to non-unique value' };
            } catch (error: any) {
                const expected = 'violates unique constraint';
                assert.equal(error.message.includes(expected), true, `error message should contain '${expected}'`)
                return { success: true, message: 'Success' };
            }
        }
    },
    {
        suite: 'Persistence Service',
        name: 'select should return correct results after insert of not unique value',
        run: async (service: PersistenceService) => {
            const query = SELECT_QUERY;
            const result = await service.select(query);
            assert.equal(result.length, 1, 'incorrect result count');
            assert.deepStrictEqual(result, [INSERTED], 'incorrect results');
            return { success: true, message: 'Success' };
        }
    },
    {
        suite: 'Persistence Service',
        name: 'update should return correct row count',
        run: async (service: PersistenceService) => {
            const query = UPDATE_QUERY;
            const result = await service.execute(query);
            assert.equal(result, 1, 'incorrect updated');
            return { success: true, message: 'Success' };
        }
    },
    {
        suite: 'Persistence Service',
        name: 'select should return correct results after update',
        run: async (service: PersistenceService) => {
            const query = SELECT_QUERY;
            const result = await service.select(query);
            assert.equal(result.length, 1, 'incorrect result count');
            assert.deepStrictEqual(result, [UPDATED], 'incorrect results');
            return { success: true, message: 'Success' };
        }
    },
    {
        suite: 'Persistence Service',
        name: 'delete should return correct row count',
        run: async (service: PersistenceService) => {
            const query = DELETE_QUERY;
            const result = await service.execute(query);
            assert.equal(result, 1, 'incorrect deleted');
            return { success: true, message: 'Success' };
        }
    },
    {
        suite: 'Persistence Service',
        name: 'select should return correct results after delete',
        run: async (service: PersistenceService) => {
            const query = SELECT_QUERY;
            const result = await service.select(query);
            assert.equal(result.length, 0, 'incorrect result count');
            assert.deepStrictEqual(result, [], 'incorrect results');
            return { success: true, message: 'Success' };
        }
    },
    {
        suite: 'Persistence Service',
        name: 'insert should fail when not_null column is null',
        run: async (service: PersistenceService) => {
            try {
                await service.execute(INSERT_NULL_QUERY);
                return { success: false, message: 'Error should have been thrown due to null value' };
            } catch (error: any) {
                const expected = 'violates not-null constraint';
                assert.equal(error.message.includes(expected), true, `error message should contain '${expected}'`)
                return { success: true, message: 'Success' };
            }
        }
    },
    {
        suite: 'Persistence Service',
        name: 'select should return correct results after null insert',
        run: async (service: PersistenceService) => {
            const query = SELECT_QUERY;
            const result = await service.select(query);
            assert.equal(result.length, 0, 'incorrect result count');
            assert.deepStrictEqual(result, [], 'incorrect results');
            return { success: true, message: 'Success' };
        }
    },
];

export { tests };


const INSERTED = {
    test_uuid: 'c1124c4b-e798-4221-8748-03b143fa0428',
    test_text: 'some test',
    test_number: 1234,
    test_unique: 'unique value',
    test_not_null: 'any value',
    test_serial: 1,
    test_default: 'DEFAULT_VALUE_SET',
}

const UPDATED = {
    test_uuid: 'c1124c4b-e798-4221-8748-03b143fa0428',
    test_text: 'some test updated',
    test_number: 9876,
    test_unique: 'unique value updated',
    test_not_null: 'any value updated',
    test_serial: 2,
    test_default: 'default value updated',
}

const SELECT_QUERY = `SELECT * FROM integration_test`;
const DELETE_QUERY = `DELETE FROM integration_test WHERE test_uuid = '${ UPDATED.test_uuid }'`;
const INSERT_QUERY = `INSERT INTO integration_test (
    "test_uuid", "test_text", "test_number", "test_unique", "test_not_null"
) VALUES (
    '${ INSERTED.test_uuid }',
    '${ INSERTED.test_text }',
    ${ INSERTED.test_number },
    '${ INSERTED.test_unique }',
    '${ INSERTED.test_not_null }'
)`;
const UPDATE_QUERY = `UPDATE integration_test SET 
    "test_uuid" = '${ UPDATED.test_uuid }',
    "test_text" = '${ UPDATED.test_text }',
    "test_number" = ${ UPDATED.test_number },
    "test_unique" = '${ UPDATED.test_unique }',
    "test_not_null" = '${ UPDATED.test_not_null }',
    "test_serial" = ${ UPDATED.test_serial },
    "test_default" = '${ UPDATED.test_default }'
`;
const INSERT_NOT_UNIQUE_QUERY = `INSERT INTO integration_test (
    "test_uuid", "test_text", "test_number", "test_unique", "test_not_null"
) VALUES (
    '35426da7-89da-4d27-9e75-980126aaf426',
    '${ INSERTED.test_text }',
    ${ INSERTED.test_number },
    '${ INSERTED.test_unique }',
    '${ INSERTED.test_not_null }'
)`;
const INSERT_NULL_QUERY = `INSERT INTO integration_test (
    "test_uuid", "test_text", "test_number", "test_unique"
) VALUES (
    '${ INSERTED.test_uuid }',
    '${ INSERTED.test_text }',
    ${ INSERTED.test_number },
    '${ INSERTED.test_unique }'
)`;