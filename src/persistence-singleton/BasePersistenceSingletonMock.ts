import { SystemConfiguration } from '@etauker/utilities';
import { BasePersistenceSingleton } from './BasePersistenceSingleton';

export class BasePersistenceSingletonMock extends BasePersistenceSingleton {


    //===========================================
    //               CONSTRUCTOR
    //===========================================
    constructor(systemConfig: SystemConfiguration) {
        super(systemConfig);
    };


    //===========================================
    //              STATIC FUNCTIONS
    //===========================================
    /**
     *  Removes stored BasePersistenceSingletonMock instance if one exists.
     *  Otherwise does nothing.
     */
    public static resetInstance(): void {
        BasePersistenceSingleton._resetInstance();
    }

    /**
     * Returns an instance of BasePersistenceSingletonMock.
     * If an instance exists, returns the existing
     * instance ignoring the provided system configuration.
     * If one doesn't exist, creates an instance, stores it
     * on BasePersistenceSingletonMock and returns the instance.
     *
     * @param { SystemConfiguration } systemConfig The system
     *      configuration which should be assigned to the new instance.
     */
    public static getInstance (systemConfig: SystemConfiguration): BasePersistenceSingletonMock {
        return super._getInstance<BasePersistenceSingletonMock>(new BasePersistenceSingletonMock(systemConfig));
    }
}
