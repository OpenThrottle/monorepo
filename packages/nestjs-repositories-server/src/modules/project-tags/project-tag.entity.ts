/**
 * @description TypeORM entity for the openthrottle `project_tags` table: one row per (project_id, tag).
 * Attaching and detaching a tag is a toggle, so it extends `BaseHardDeleteModel` and a delete
 * is a hard delete. It keeps its own `updated_at` for provenance upgrades.
 * Matches databases/openthrottle/migrations (070, 179).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';

import type { TagSource } from '../plan-tags/tag-source/tag-source.types.ts';
import type { Project } from '../projects/project.entity.ts';

@Entity('project_tags')
export class ProjectTag extends BaseHardDeleteModel {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @ManyToOne('Project', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @Column({ name: 'tag', type: 'text' })
  tag!: string;

  @Column({ name: 'dimension', type: 'text' })
  dimension!: string;

  @Column({ name: 'source', type: 'text' })
  source!: TagSource;

  @Column({
    name: 'confidence',
    nullable: true,
    transformer: {
      from: (value: string | null): number | null =>
        value == null ? null : Number(value),
      to: (value: number | null): number | null => value,
    },
    type: 'numeric',
  })
  confidence!: number | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
