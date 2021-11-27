import pg from 'pg';
import { IPoolFactory } from '../persistence/pool-factory.interface';
const { Pool } = pg;

import { IPoolConfig } from './postgres-pool-configuration.interface';
import { IPool } from './postgres-pool.interface';

export class PoolFactory implements IPoolFactory {
    makePool(config: IPoolConfig): IPool {
        if (!config.database) {
            throw new Error('Database not set');
        }
        if (!config.user) {
            throw new Error('Database user not set');
        }
        if (!config.password) {
            throw new Error('Database password not set');
        }
        if (!config.host) {
            throw new Error('Database host not set');
        }
        if (!config.port) {
            throw new Error('Database port not set');
        }
        return new Pool(config);
    }
}