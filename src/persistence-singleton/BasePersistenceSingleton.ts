import { FieldInfo } from 'mysql';
import { MySql, MySqlPool, MySqlConnection } from '../mysql/public';
import {
    ClassInfoType,
    SystemConfiguration,
    DatabaseConfiguration,
    ErrorGenerator,
    DatabaseQueryResult,
    DatabaseTransactionType,
} from '@etauker/utilities';

interface ConnectionAndResult {
    connection: MySqlConnection;
    result: DatabaseQueryResult;
};

/**
 * A base singleton class that should be extended to
 * implement app specific data access logic.
 */
export class BasePersistenceSingleton {

    //===========================================
    //               PROPERTIES
    //===========================================
    private static _classInfo: ClassInfoType = {
        package: 'com.etauker.development.base-classes',
        module: 'persistence',
        class: 'BasePersistenceSingleton',
        errors: [
            { code: 1, http: 500, message: 'Database connection pool issue occured.' },
            { code: 2, http: 500, message: 'Error getting database connection.' },
            { code: 3, http: 500, message: 'Error starting a transaction.' },
            { code: 4, http: 500, message: 'Error querying the database.' },
            { code: 5, http: 500, message: 'Error committing query to the database.' },
            { code: 6, http: 500, message: 'Error rolling back database query' }
        ]
    };
    private _errorGenerator: ErrorGenerator;

    private static instance: BasePersistenceSingleton;
    private config: DatabaseConfiguration;
    private pool: MySqlPool;


    //===========================================
    //               CONSTRUCTOR
    //===========================================
    constructor(systemConfig: SystemConfiguration) {

        // Set class variables for the base class
        this._errorGenerator = new ErrorGenerator(BasePersistenceSingleton._classInfo);

        // Set variables accessible to the subclasses
        this.config = systemConfig.getDatabaseConfig();

        // Create the connection pool
        this.pool = MySql.createPool({
            host    : this.getConfig().getHost(),
            user    : this.getConfig().getUser(),
            password: this.getConfig().getPassword(),
            database: this.getConfig().getDatabase(),
            port: this.getConfig().getPort(),
            connectionLimit: this.getConfig().getConnections()
        });
    };

    //===========================================
    //              STATIC FUNCTIONS
    //===========================================
    /**
     * Remove an existing instance of BasePersistenceSingleton's subclass.
     */
    protected static _resetInstance(): void {
        BasePersistenceSingleton.instance = undefined;
    }

    /**
     * Returns an instance of BasePersistenceSingleton's subclass.
     * @param { Function } constructor A constructor function of the subclass.
     *      Any required parameters thould be bound to the provided function.
     *      Used to instantiate a new instance of the subclass if none exis.
     * @return { <SubClass extends BasePersistenceSingleton> } An instance of the subclass of BasePersistenceSingleton.
     *      If an instance already exists, returns that instance.
     *      Otherwise returns a new instance created with the given constructor.
     */
    protected static _getInstance <SubClass extends BasePersistenceSingleton>(instance: SubClass): SubClass {
        if (!BasePersistenceSingleton.instance) {
            BasePersistenceSingleton.instance = instance;
        }
        return BasePersistenceSingleton.instance as SubClass;
    }



    //===========================================
    //             GETTERS / SETTERS
    //===========================================
    /**
     * Get the database configuration for the PersistenceSingleton.
     * @returns { DatabaseConfiguration } The database configuration used by the instance.
     */
    public getConfig(): DatabaseConfiguration {
        return this.config;
    }



    //===========================================
    //             PUBLIC FUNCTIONS
    //===========================================
    /**
     * Executes an insert statement in the database.
     * @param { string } query The INSERT query execute in the database
     * @returns { Promise<DatabaseQueryResult> } The results of the query execution.
     */
    public insert(query: string): Promise<DatabaseQueryResult> {
        let connection: MySqlConnection;
        return this.getConnection()
            .then((mysqlConnection) => { connection = mysqlConnection })
            .then(() => this.beginTransaction(connection))
            .then(() => this.queryDatabase(connection, query, 'INSERT'))
            .then((result) => this.commitOrRollback({ connection, result }))
            .then((result) => this.releaseConnection({ connection, result }))
            .catch((error) => this.releaseConnectionAndReject(connection, error))
    }

    /**
     * Executes an select statement in the database.
     * @param { string } query The SELECT query execute in the database
     * @returns { Promise<DatabaseQueryResult> } The results of the query execution.
     */
    public select(query: string): Promise<DatabaseQueryResult> {
        let connection: MySqlConnection;
        return this.getConnection()
            .then((mysqlConnection) => { connection = mysqlConnection })
            .then(() => this.beginTransaction(connection))
            .then(() => this.queryDatabase(connection, query, 'SELECT'))
            .then((result) => this.commitOrRollback({ connection, result }))
            .then((result) => this.releaseConnection({ connection, result }))
            .catch((error) => this.releaseConnectionAndReject(connection, error))
    }

    /**
     * Executes an update statement in the database.
     * @param { string } query The UPDATE query execute in the database
     * @returns { Promise<DatabaseQueryResult> } The results of the query execution.
     */
    public update(query: string): Promise<DatabaseQueryResult> {
        let connection: MySqlConnection;
        return this.getConnection()
            .then((mysqlConnection) => { connection = mysqlConnection })
            .then(() => this.beginTransaction(connection))
            .then(() => this.queryDatabase(connection, query, 'UPDATE'))
            .then((result) => this.commitOrRollback({ connection, result }))
            .then((result) => this.releaseConnection({ connection, result }))
            .catch((error) => this.releaseConnectionAndReject(connection, error))
    }

    /**
     * Executes an delete statement in the database.
     * @param { string } query The DELETE query execute in the database
     * @returns { Promise<DatabaseQueryResult> } The results of the query execution.
     */
    public delete(query: string): Promise<DatabaseQueryResult> {
        let connection: MySqlConnection;
        return this.getConnection()
            .then((mysqlConnection) => { connection = mysqlConnection })
            .then(() => this.beginTransaction(connection))
            .then(() => this.queryDatabase(connection, query, 'DELETE'))
            .then((result) => this.commitOrRollback({ connection, result }))
            .then((result) => this.releaseConnection({ connection, result }))
            .catch((error) => this.releaseConnectionAndReject(connection, error))
        }


    //===========================================
    //             PRIVATE FUNCTIONS
    //===========================================
    private getConnection(): Promise<MySqlConnection> {
        return this.pool.getConnection();
    }

    private beginTransaction(connection: MySqlConnection): Promise<void> {
        return connection.beginTransaction()
        .catch((error) => Promise.reject(this._errorGenerator.getError(3, error)));
    }

    private queryDatabase(
        connection: MySqlConnection,
        query: string,
        type: DatabaseTransactionType
    ): Promise<DatabaseQueryResult> {

        return connection.query(query)
        .then(([rows, fields]: [any, FieldInfo[]]) => this.generateQueryResult(type, rows))
        .catch((error) => {
            return this.rollbackTransaction({ connection, result: new DatabaseQueryResult() })
            .then(() => Promise.reject(this._errorGenerator.getError(4, error)))
            .catch(error => Promise.reject(error));
        })
    }

    private generateQueryResult(type: DatabaseTransactionType, rows: any): DatabaseQueryResult {
        return new DatabaseQueryResult({
            created: type === 'INSERT' && rows ? rows.affectedRows : 0,
            updated: type === 'UPDATE' && rows ? rows.affectedRows : 0,
            deleted: type === 'DELETE' && rows ? rows.affectedRows : 0,
            results: type === 'SELECT' ? rows : []
        });
    }

    private commitOrRollback({ connection, result }: ConnectionAndResult): Promise<DatabaseQueryResult> {
        return this.getConfig().getCommit()
            ? this.commitTransaction({ connection, result })
            : this.rollbackTransaction({ connection, result });
    }

    private commitTransaction({ connection, result }: ConnectionAndResult): Promise<DatabaseQueryResult> {
        return connection.commit()
        .then(() => result)
        .catch(error => Promise.reject(this._errorGenerator.getError(5, error)));
    }

    private rollbackTransaction({ connection, result }: ConnectionAndResult): Promise<DatabaseQueryResult> {
        return connection.rollback()
        .then(() => result)
        .catch(error => Promise.reject(this._errorGenerator.getError(6, error)));
    }

    private releaseConnection({ connection, result }: ConnectionAndResult): Promise<DatabaseQueryResult> {
        connection.release();
        return Promise.resolve(result);
    }

    private releaseConnectionAndReject(connection: MySqlConnection, error: any): Promise<any> {
        try {
            this.releaseConnection({ connection, result: null });
        } catch (releaseError) {

            // Return the original error
            return Promise.reject(error);
        }
        return Promise.reject(error);
    }
}
