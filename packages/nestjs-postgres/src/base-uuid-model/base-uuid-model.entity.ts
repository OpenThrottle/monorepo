import {
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UUID_FLAG_MODEL_CONVENTION } from '../model-convention/model-convention.constants.ts';

/**
 * @description The columns a uuid-keyed table behind a `BaseRepository` shares: a `uuid`
 * primary key whose default the table owns (e.g. `gen_random_uuid()`), insert and update
 * timestamps, and a nullable `is_deleted` soft-delete flag where `NULL` reads as live.
 * Extend it from an `@Entity()` class; it declares no table itself. The sibling of
 * `BaseModel` for tables keyed on `uuid` rather than `id`.
 * @public
 */
export abstract class BaseUuidModel {
  /**
   * @description Tells `BaseRepository` to key on `uuid` and soft delete through
   * `is_deleted`.
   */
  static readonly modelConvention = UUID_FLAG_MODEL_CONVENTION;

  // Declared first so `uuid` is the first column. No column comment, for the same
  // FK-comment-copying reason as `BaseModel.id`.
  @PrimaryGeneratedColumn('uuid', { name: 'uuid' })
  uuid!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({
    default: false,
    name: 'is_deleted',
    nullable: true,
    type: 'boolean',
  })
  isDeleted!: boolean | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
