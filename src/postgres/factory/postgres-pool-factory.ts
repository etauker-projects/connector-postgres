import pg from 'pg';
const { Pool } = pg;

import { IPoolFactory } from '../../persistence/model/pool-factory.interface';
import { IPoolConfig } from '../model/postgres-pool-config.interface';
import { IPool } from '../model/postgres-pool.interface';


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