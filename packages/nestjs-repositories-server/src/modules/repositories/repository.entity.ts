/**
 * @description TypeORM entity for the openthrottle `repositories` table. Extends `BaseModel`, so a
 * delete is a soft delete (`RepositoriesRepository.remove` also soft-deletes the repository's
 * checkouts). Matches databases/openthrottle/migrations (078, 178).
 * Identity is the normalized git remote URL; provisional rows (NULL remote) exist
 * for local-only folders until a remote is detected. The URL is unique among live rows only.
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import type { Project } from '../projects/project.entity.ts';

@Entity('repositories')
export class Repository extends BaseModel {
  @Column({ name: 'normalized_remote_url', nullable: true, type: 'text' })
  normalizedRemoteUrl!: string | null;

  @Column({ name: 'name', type: 'text' })
  name!: string;

  @Column({ name: 'ledger_harvest_cursor', nullable: true, type: 'text' })
  ledgerHarvestCursor!: string | null;

  @Column({
    default: true,
    name: 'ledger_harvest_enabled',
    type: 'boolean',
  })
  ledgerHarvestEnabled!: boolean;

  @Column({
    name: 'ledger_harvested_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  ledgerHarvestedAt!: Date | null;

  @Column({ name: 'default_branch', nullable: true, type: 'text' })
  defaultBranch!: string | null;

  @Column({ name: 'project_id', nullable: true, type: 'uuid' })
  projectId!: string | null;

  @ManyToOne('Project', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project?: Project;
}
