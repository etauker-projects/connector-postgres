import { IPoolConfig } from '../postgres/postgres-pool-configuration.interface';
import { IPool } from '../postgres/postgres-pool.interface';

export interface IPoolFactory {

    // note: could be static but TS interfaces have issues with static methods    
    makePool(config:IPoolConfig): IPool;

}