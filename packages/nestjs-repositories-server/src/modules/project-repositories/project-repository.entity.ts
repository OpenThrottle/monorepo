/**
 * @description TypeORM entity for the openthrottle `project_repositories` table: one row per
 * (project_id, repository_id) pair, the many-to-many link between projects and repositories.
 * Linking and unlinking is a toggle, so it extends `BaseHardDeleteModel` and a delete is a hard
 * delete. A soft delete of a project or repository fires no cascade, so reads filter on the
 * live project and repository. Matches databases/openthrottle/migrations (184).
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

import type { Project } from '../projects/project.entity.ts';
import type { Repository } from '../repositories/repository.entity.ts';

@Entity('project_repositories')
export class ProjectRepository extends BaseHardDeleteModel {
  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @ManyToOne('Project', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @Column({ name: 'repository_id', type: 'uuid' })
  repositoryId!: string;

  @ManyToOne('Repository', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'repository_id' })
  repository?: Repository;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
