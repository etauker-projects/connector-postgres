import pg from 'pg';

export interface IPoolFactory {
    makePool(config: pg.PoolConfig): pg.Pool;
}