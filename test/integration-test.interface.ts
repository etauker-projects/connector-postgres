import { PersistenceService } from '../src/persistence/persistence-service';
import { IIntegrationTestResult } from './integration-test-result.interface';

export interface IIntegrationTest {
    suite: string;
    name: string;
    run: (service: PersistenceService) => Promise<IIntegrationTestResult>;
}