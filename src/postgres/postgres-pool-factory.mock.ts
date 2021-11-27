import sinon from 'sinon';
import { IPersistenceClient } from '../persistence/persistence-client.interface';
import { IPoolConfig } from './postgres-pool-configuration.interface';
import { IPool } from './postgres-pool.interface';

export class PoolFactoryMock {

    connect: sinon.SinonStub;

    constructor() {
        this.connect = sinon.stub().resolves();
    }

    makePool(config: IPoolConfig): IPool {
        return {
            connect: this.connect as () => Promise<IPersistenceClient>,
        } as IPool
    }
}