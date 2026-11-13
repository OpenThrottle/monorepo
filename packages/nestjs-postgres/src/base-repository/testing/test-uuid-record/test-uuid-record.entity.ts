import { Column, Entity } from 'typeorm';

import { BaseUuidModel } from '../../../base-uuid-model/base-uuid-model.entity.ts';

/**
 * @description The `BaseUuidModel` sibling of `TestRecord`, used only to exercise the
 * uuid-key / flag soft-delete convention of `BaseRepository` in tests.
 */
@Entity({ name: 'test_uuid_records' })
export class TestUuidRecord extends BaseUuidModel {
  @Column({ name: 'note', nullable: true, type: 'text' })
  note!: string | null;

  @Column({ name: 'quantity', type: 'integer' })
  quantity!: number;
}
