import sinon, { SinonStub } from 'sinon';
// import { IQueryConfig } from './model/query-config.interface';
// import { PersistenceTransaction } from './transaction/persistence-transaction';
import { PersistenceTransactionMock } from './transaction/persistence-transaction.mock';
// import { IPersistenceResult } from './model/persistence-results.interface';

export class PersistenceConnectorMock {

    // private pool: IPool;
    // private config: IQueryConfig = {
    //     maxStatements: 1,   // multiple statements in single method call not currently supported
    //     commit: true,
    // };

    // private inserted = 0;
    // private updated = 0;
    // private deleted = 0;
    // private results: any[] = [];

    public transact: PersistenceTransactionMock;
    public select: SinonStub;
    public insert: SinonStub;
    public update: SinonStub;
    public delete: SinonStub;

    constructor() {
        this.transact = PersistenceTransactionMock.getInstance() as any as PersistenceTransactionMock;
        this.select = sinon.stub().resolves([]);
        this.insert = sinon.stub().resolves(0);
        this.update = sinon.stub().resolves(0);
        this.delete = sinon.stub().resolves(0);
        // this.results.push([{ id: randomUUID(), name: 'First' }]);
    }

    //------------------------------
    // Public methods
    //------------------------------
    // public transact(): PersistenceTransaction {
    //     // return new PersistenceTransaction(this.pool.connect());
    //     return PersistenceTransactionMock.getInstance();
    // }

    // public insert(sql: string, params: any[] = [], partialConfig?: Partial<IQueryConfig>): Promise<number> {
    //     return sinon.stub().resolves(0);
    // }

    /**
     * Execute a 'SELECT' statement and return the list of results.
     */
    // public select<T>(sql: string, params: any[] = []): Promise<T[]> {
    //     const statements = this.splitStatements(sql);
    //     // TODO: append 'RETURNING *' to the query and return the inserted items

    //     return Promise.resolve()
    //         .then(() => this.verifyStatementCount(this.config.maxStatements, statements.length))
    //         .then(() => this.verifyStatementMethod('Select', 'SELECT', sql))
    //         .then(() => this.execute<T>(sql, params, false))
    //         .then(res => res.results)
    //     ;
    // }


    // /**
    //  * Execute 'UPDATE' statement and return the number of updated rows.
    //  */
    // public update(sql: string, params: any[] = [], partialConfig?: Partial<IQueryConfig>): Promise<number> {
    //     const config: IQueryConfig = { ...this.config, ...partialConfig };
    //     const statements = this.splitStatements(sql);
    //     // TODO: append 'RETURNING *' to the query and return the inserted items

    //     return Promise.resolve()
    //         .then(() => this.verifyStatementCount(config.maxStatements, statements.length))
    //         .then(() => this.verifyStatementMethod('Update', 'UPDATE', sql))
    //         .then(() => this.execute(sql, params, config.commit))
    //         .then(res => res.updated)
    //     ;
    // }


    // /**
    //  * Execute 'DELETE' statement and return the number of deleted rows.
    //  */
    // public delete(sql: string, params: any[] = [], partialConfig?: Partial<IQueryConfig>): Promise<number> {
    //     const config: IQueryConfig = { ...this.config, ...partialConfig };
    //     const statements = this.splitStatements(sql);
    //     // TODO: append 'RETURNING *' to the query and return the inserted items

    //     return Promise.resolve()
    //         .then(() => this.verifyStatementCount(config.maxStatements, statements.length))
    //         .then(() => this.verifyStatementMethod('Delete', 'DELETE', sql))
    //         .then(() => this.execute(sql, params, config.commit))
    //         .then(res => res.deleted)
    //     ;
    // }

}
