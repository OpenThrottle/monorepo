/**
 * @description TypeORM entity for the project_skills table. Matches
 * databases/migrations (061, 074, 090, 093).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from '../projects/project.entity';

/** Scalar/column fields of ProjectSkill (no relations). Use to type DTOs that mirror the entity. */
export type ProjectSkillData = Omit<ProjectSkill, 'project'>;

@Entity('project_skills')
export class ProjectSkill {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
