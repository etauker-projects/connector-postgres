# Connector: Postgres
Node postgres connector for etauker projects. 
Simplifies postgres database connections and allows running of database migrations from node applications.

## Usage

A pool factory and a persistance configuration object are needed to instantiate a connector object.
```ts
import {
    IPersistenceConfig,
    PoolFactory,
    PersistenceConnector    
} from '@etauker/connector-postgres';

const config: IPersistenceConfig = {
    database: process.env.DATABASE_DATABASE,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT),
};

const connectionPool = new PoolFactory().makePool(config);
const connector = new PersistenceConnector(connectionPool);
```

Basic usage
```ts
const query = 'SELECT * FROM car WHERE make = ? AND model = ?';
const params = [ 'Ford', 'Fiesta' ];
const results = await connector.select<Car>(query, params);
console.log(results);
```

Example output
```js
[
    {
        id: '95c873fd-9326-41a7-9663-45f0132177b0',
        make: 'Ford',
        model: 'Fiesta',
        colour: 'Green'
    }
]
```

## Features

### Transaction management
The connector allows bypassing the simple CRUD methods and making use of the underlying transaction object to make atomic transactions.
```ts
const carId = 'd752f15c-e22f-4697-8eb6-e449c198ecf5';
const buyerId = '976a5724-f21e-43d4-99c8-e886ee491dd2';
const sellerId = 'f53deeb1-f9bc-450c-91f2-cd1c6033900a';

const buyerQuery = 'UPDATE person SET car_id = ? WHERE person_id = ?';
const sellerQuery = 'UPDATE person SET car_id = NULL WHERE person_id = ?';

const transaction = await connector.transact();
const [ buyerRowsUpdated, sellerRowsUpdated ] = await Promise.all([
    transaction.continue(buyerQuery, [ carId, buyerId ]),
    transaction.continue(sellerQuery, [ carId, sellerId ]),
]);

await transaction.commit();

console.log(`${ buyerRowsUpdated + sellerRowsUpdated } rows updated`);
// output: 2 rows updated
```

### Database migrations
The library also provides functionality for executing database migrations.  
> **Note:** to run database migrations the connector needs to create some tables containing information about the state of migration execution. These tables currently make use of a certain database function which must first be created manually. This function can be found in [scripts/create_type_if_not_exists.sql](./scripts/create_type_if_not_exists.sql).

A `{migration-root}` directory containing all required migrations must first be created with the following structure. The migration directories can be named anything but should be prefixed with a number to ensure deterministic order. The files inside the migration directory must be names `change.sql` and `rollback.sql`.
```
{migration-root}
    |- 01.{first-migration}
        |- change.sql
        |- rollback.sql
    |- 02.{second-migration}
        |- change.sql
        |- rollback.sql
    |- ...
```

Change and rollback files must contain sql statements to be executed. 
The `change` file is executed during normal circumstances. 
If one of the migrations fails, the `rollback` file is executed for all previous migrations in that set. 
```sql
-- {migration-root}/01.create-car-table/change.sql
CREATE TABLE IF NOT EXISTS cars (
    id              uuid            PRIMARY KEY,
    make            varchar(255)    UNIQUE,
    model           varchar(255)    NOT NULL,
    colour          varchar(255)
);

-- {migration-root}/01.create-car-table/rollback.sql
DROP TABLE IF EXISTS cars CASCADE;
```

The triggering of the migrations from code can be done like this
```ts
const migrationRoot = 'absolute/path/to/migration-root';
const persistenceConfig = getPersistenceConfig();
const migrationConfig = { debug: false };

const pool = new PoolFactory().makePool(persistenceConfig);
const connector = new PersistenceConnector(pool);
const service = new MigrationService(migrationConfig, connector);
await service.setup();
await service.loadAndExecuteChanges(migrationRoot);
```

## Changelog

### Version 4.0.0
Added
- setup migration script to create helper functions

Removed 
- dependence on pre-existing helper functions

Changed 
- migrations and code logic to use helper functions in the provided schema
