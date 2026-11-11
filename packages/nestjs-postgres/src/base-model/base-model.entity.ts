import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * @description The columns every table behind a `BaseRepository` shares: a uuidv7
 * primary key, insert and update timestamps, and a `deleted_at` soft-delete marker. Extend
 * it from an `@Entity()` class; it declares no table itself.
 * @public
 */
export abstract class BaseModel {
  // Declared first so `id` is the first column of every table. It deliberately carries no
  // column comment: TypeORM copies a referenced column's comment onto the FK columns that
  // `@ManyToOne` creates, and `@JoinColumn` cannot override it, so a comment here would
  // land on every `*_id` column in the schema.
  @PrimaryColumn({ default: () => 'uuidv7()', type: 'uuid' })
  id!: string;

  @CreateDateColumn({
    comment: 'When this row was inserted',
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt!: Date;

  @DeleteDateColumn({
    comment: `When this row was soft deleted; NULL for rows that are still live`,
    name: 'deleted_at',
    nullable: true,
    type: 'timestamptz',
  })
  deletedAt!: Date | null;

  @UpdateDateColumn({
    comment: 'When this row was last updated',
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt!: Date;
}
