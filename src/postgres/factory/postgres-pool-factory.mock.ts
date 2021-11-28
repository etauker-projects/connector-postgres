import sinon from 'sinon';
import { IPoolClient } from '../model/postgres-pool-client.interface';
import { IPoolConfig } from '../model/postgres-pool-config.interface';
import { IPoolFactory } from '../../persistence/model/pool-factory.interface';
import { IPool } from '../model/postgres-pool.interface';

export class PoolFactoryMock implements IPoolFactory {

    connect: sinon.SinonStub;

    constructor() {
        this.connect = sinon.stub().resolves();
    }

    makePool(config: IPoolConfig): IPool {
        return {
            connect: this.connect as () => Promise<IPoolClient>,
        } as IPool
    }
}