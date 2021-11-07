// import sinon from 'sinon';

import { IPoolConfig } from './postgres-pool-configuration.interface';
import { IPool } from './postgres-pool.interface';

export class PoolFactoryMock {
    makePool(config: IPoolConfig): IPool {
        return {
            // connect(): sinon.stub()
        } as IPool
    }
}