import { Column, Entity } from 'typeorm';

import { BaseModel } from '../../../base-model/base-model.entity.ts';

/**
 * @description A minimal table used only to exercise `BaseRepository` in tests: a nullable
 * uuid, a numeric and a nullable text column on top of the `BaseModel` columns.
 */
@Entity({ name: 'test_records' })
export class TestRecord extends BaseModel {
  @Column({ name: 'note', nullable: true, type: 'text' })
  note!: string | null;

  @Column({ name: 'owner_id', nullable: true, type: 'uuid' })
  ownerId!: string | null;

  @Column({ name: 'quantity', type: 'integer' })
  quantity!: number;
}
