import { CreateDateColumn, PrimaryColumn } from 'typeorm';

import { ID_HARD_DELETE_MODEL_CONVENTION } from '../model-convention/model-convention.constants.ts';

/**
 * @description The columns an append-only, log or derived table behind a `BaseRepository`
 * shares: a uuidv7 primary key and an insert timestamp, with no soft-delete column, so
 * `remove` and `removeMany` hard delete. A table that also updates its rows declares its
 * own `updated_at` (`@UpdateDateColumn`); it is treated as managed like the base columns.
 * Extend it from an `@Entity()` class; it declares no table itself.
 * @public
 */
export abstract class BaseHardDeleteModel {
  /**
   * @description Tells `BaseRepository` to key on `id` and to delete for real.
   */
  static readonly modelConvention = ID_HARD_DELETE_MODEL_CONVENTION;

  // Declared first so `id` is the first column. No column comment, for the same
  // FK-comment-copying reason as `BaseModel.id`.
  @PrimaryColumn({ default: () => 'uuidv7()', type: 'uuid' })
  id!: string;

  @CreateDateColumn({
    comment: 'When this row was inserted',
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;
}
