import { PersistenceConnector } from '../src';
import { IIntegrationTestResult } from './integration-test-result.interface';

export interface IIntegrationTest {
    suite: string;
    name: string;
    run: (connector: PersistenceConnector) => Promise<IIntegrationTestResult>;
}