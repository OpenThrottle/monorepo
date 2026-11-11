/**
 * @description TypeORM entity for the cms `layouts` table: a publishable page
 * addressed by slug, rooted at one fragment. Matches databases/cms/migrations
 * (004).
 * @public
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import {
  CMS_STATUS,
  CMS_STATUS_VALUES,
} from '../../config/config.constants.ts';
import type { CmsStatus } from '../../config/config.types.ts';
import { Fragment } from '../fragments/fragment.entity.ts';

@Entity('layouts')
export class Layout {
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  /** Root of this layout's fragment tree; unique per layout. */
  @JoinColumn({
    foreignKeyConstraintName: 'layouts_fragment_uuid_fkey',
    name: 'fragment_uuid',
  })
  @OneToOne(() => Fragment)
  fragment?: Fragment;

  @Column({ name: 'fragment_uuid', type: 'uuid' })
  @Index('idx_layouts_fragment_uuid', { unique: true })
  fragmentUuid!: string;

  @Column({
    default: false,
    name: 'is_deleted',
    nullable: true,
    type: 'boolean',
  })
  isDeleted!: boolean | null;

  @Column({ default: () => "'{}'::jsonb", name: 'metadata', type: 'jsonb' })
  metadata!: Record<string, unknown>;

  @Column({ name: 'name', type: 'character varying' })
  name!: string;

  @Column({ name: 'slug', type: 'character varying' })
  @Index('idx_layouts_slug', { unique: true })
  slug!: string;

  @Column({
    default: CMS_STATUS.DRAFT,
    enum: CMS_STATUS_VALUES,
    enumName: 'layout_status',
    name: 'status',
    nullable: true,
    type: 'enum',
  })
  status!: CmsStatus | null;

  @Column({
    array: true,
    default: () => "'{}'::character varying[]",
    name: 'tags',
    type: 'character varying',
  })
  tags!: string[];

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @PrimaryGeneratedColumn('uuid', { name: 'uuid' })
  uuid!: string;
}
