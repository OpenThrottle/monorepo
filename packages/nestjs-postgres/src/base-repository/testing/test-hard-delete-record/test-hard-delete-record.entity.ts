import { Column, Entity, UpdateDateColumn } from 'typeorm';

import { BaseHardDeleteModel } from '../../../base-hard-delete-model/base-hard-delete-model.entity.ts';

/**
 * @description The `BaseHardDeleteModel` sibling of `TestRecord`, used only to exercise the
 * no-soft-delete convention of `BaseRepository` in tests. It declares its own `updated_at`,
 * as a table that updates its rows does.
 */
@Entity({ name: 'test_hard_delete_records' })
export class TestHardDeleteRecord extends BaseHardDeleteModel {
  @Column({ name: 'note', nullable: true, type: 'text' })
  note!: string | null;

  @Column({ name: 'quantity', type: 'integer' })
  quantity!: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
