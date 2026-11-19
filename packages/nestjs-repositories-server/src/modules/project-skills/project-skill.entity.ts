/**
 * @description TypeORM entity for the openthrottle `project_skills` table: the ingested skill
 * registry of a project. Extends `BaseModel`, so an explicit remove is a soft delete that frees
 * the (project, slug) pair for a live row; `orphaned_at` is a separate, ingest-owned marker for a
 * slug that vanished from disk. Matches databases/openthrottle/migrations (061, 074, 090, 093,
 * 179).
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import type { Project } from '../projects/project.entity.ts';

@Entity('project_skills')
export class ProjectSkill extends BaseModel {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @ManyToOne('Project', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @Column({ name: 'slug', type: 'text' })
  slug!: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;

  @Column({ array: true, default: () => "'{}'", name: 'tags', type: 'text' })
  tags!: string[];

  @Column({
    name: 'disable_model_invocation',
    nullable: true,
    type: 'boolean',
  })
  disableModelInvocation!: boolean | null;

  @Column({ default: 'external', name: 'source', type: 'text' })
  source!: string;

  @Column({ name: 'source_url', nullable: true, type: 'text' })
  sourceUrl!: string | null;

  @Column({ name: 'source_path', type: 'text' })
  sourcePath!: string;

  @Column({ name: 'ingested_at', type: 'timestamp with time zone' })
  ingestedAt!: Date;

  @Column({
    name: 'orphaned_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  orphanedAt!: Date | null;
}
