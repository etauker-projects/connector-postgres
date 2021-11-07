import pg from 'pg';
const { Pool } = pg;

import { IPoolConfig } from './postgres-pool-configuration.interface';
import { IPool } from './postgres-pool.interface';

export class PoolFactory {
    makePool(config: IPoolConfig): IPool {
        return new Pool(config);
    }
}