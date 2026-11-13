import type { CreateModelInput } from '../../../base-model/base-model.types.ts';
import { BaseRepository } from '../../base-repository.repository.ts';
import type { TestUuidRecord } from './test-uuid-record.entity.ts';

/**
 * @description The smallest concrete uuid-keyed `BaseRepository`, used only by tests.
 */
export class TestUuidRecordRepository extends BaseRepository<
  TestUuidRecord,
  CreateModelInput<TestUuidRecord>
> {
  protected readonly tableName = 'test_uuid_records';
}
