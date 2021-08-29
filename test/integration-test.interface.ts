import { IPersistenceService } from '../src/persistence/persistence-service.interface';
import { IIntegrationTestResult } from './integration-test-result.interface';

export interface IIntegrationTest {
    suite: string;
    name: string;
    run: (service: IPersistenceService) => Promise<IIntegrationTestResult>;
}