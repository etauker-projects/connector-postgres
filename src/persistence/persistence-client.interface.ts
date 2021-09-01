import pg from 'pg';

export interface IPersistenceClient extends pg.PoolClient {
    
}