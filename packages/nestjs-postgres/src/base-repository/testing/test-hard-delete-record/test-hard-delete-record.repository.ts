import type { CreateModelInput } from '../../../base-model/base-model.types.ts';
import { BaseRepository } from '../../base-repository.repository.ts';
import type { TestHardDeleteRecord } from './test-hard-delete-record.entity.ts';

/**
 * @description The smallest concrete no-soft-delete `BaseRepository`, used only by tests.
 */
export class TestHardDeleteRecordRepository extends BaseRepository<
  TestHardDeleteRecord,
  CreateModelInput<TestHardDeleteRecord>
> {
  protected readonly tableName = 'test_hard_delete_records';
}
