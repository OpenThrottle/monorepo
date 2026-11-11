/**
 * @description TypeORM entity for the cms `surveys` table: a named survey whose
 * definition lives in `data`. Matches databases/cms/migrations (006).
 * @public
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('surveys')
export class Survey {
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  /** Questions, options and settings as a JSON object. */
  @Column({ default: () => "'{}'::jsonb", name: 'data', type: 'jsonb' })
  data!: Record<string, unknown>;

  @Column({
    default: false,
    name: 'is_deleted',
    nullable: true,
    type: 'boolean',
  })
  isDeleted!: boolean | null;

  @Column({ name: 'name', type: 'character varying' })
  @Index('idx_surveys_name')
  name!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @PrimaryGeneratedColumn('uuid', { name: 'uuid' })
  uuid!: string;
}
