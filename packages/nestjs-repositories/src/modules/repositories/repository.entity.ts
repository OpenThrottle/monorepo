/**
 * @description TypeORM entity for repositories. Matches databases/migrations/078.
 * Identity is the normalized git remote URL; provisional rows (NULL remote) exist
 * for local-only folders until a remote is detected.
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

export interface RepositoryData {
  readonly defaultBranch: string | null;
  readonly id: string;
  readonly name: string;
  readonly normalizedRemoteUrl: string | null;
  readonly projectId: string | null;
}

@Entity('repositories')
export class Repository {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'normalized_remote_url', nullable: true, type: 'text' })
  normalizedRemoteUrl!: string | null;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'default_branch', nullable: true, type: 'text' })
  defaultBranch!: string | null;

  @Column({ name: 'project_id', nullable: true, type: 'uuid' })
  projectId!: string | null;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
