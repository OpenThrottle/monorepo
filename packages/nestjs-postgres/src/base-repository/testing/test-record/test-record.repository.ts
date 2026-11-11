import type { CreateModelInput } from '../../../base-model/base-model.types.ts';
import { BaseRepository } from '../../base-repository.repository.ts';
import type { TestRecord } from './test-record.entity.ts';

/**
 * @description The smallest concrete `BaseRepository`, used only by tests.
 */
export class TestRecordRepository extends BaseRepository<
  TestRecord,
  CreateModelInput<TestRecord>
> {
  protected readonly tableName = 'test_records';
}
