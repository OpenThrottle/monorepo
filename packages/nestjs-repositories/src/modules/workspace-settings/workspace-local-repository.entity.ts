/**
 * @description TypeORM entity for workspace_local_repositories. Matches databases/migrations/042.
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
import { User } from '../users/user.entity';

export interface WorkspaceLocalRepositoryData {
  readonly displayName: string;
  readonly filesystemPath: string;
  readonly gitDefaultBranch: string | null;
  readonly gitRemoteUrl: string | null;
  readonly id: string;
  readonly projectId: string | null;
  readonly userId: string;
}

@Entity('workspace_local_repositories')
export class WorkspaceLocalRepository {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'filesystem_path', type: 'text' })
  filesystemPath!: string;

  @Column({ name: 'display_name', type: 'text' })
  displayName!: string;

  @Column({ name: 'git_remote_url', nullable: true, type: 'text' })
  gitRemoteUrl!: string | null;

  @Column({ name: 'git_default_branch', nullable: true, type: 'text' })
  gitDefaultBranch!: string | null;

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
