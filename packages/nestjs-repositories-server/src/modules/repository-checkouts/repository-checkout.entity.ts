/**
 * @description TypeORM entity for the openthrottle `repository_checkouts` table. Extends
 * `BaseModel`, so a delete is a soft delete: rows that reference a checkout (plan runs,
 * scheduled jobs, worktree removals) keep its id and the checkout then reads as not found.
 * Matches databases/openthrottle/migrations (078, 178).
 * A checkout is a per-user on-disk instance of a repository; the row is a cache over
 * the manifest and git state actually on disk (disk is the source of truth). The
 * (user, filesystem path) pair is unique among live rows only.
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import type { Repository } from '../repositories/repository.entity.ts';
import type { User } from '../users/user.entity.ts';
import type { RepositoryCheckoutKind } from './repository-checkouts.types.ts';

@Entity('repository_checkouts')
export class RepositoryCheckout extends BaseModel {
  @Column({ name: 'repository_id', type: 'uuid' })
  repositoryId!: string;

  @ManyToOne('Repository', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'repository_id' })
  repository?: Repository;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'filesystem_path', type: 'text' })
  filesystemPath!: string;

  @Column({
    default: false,
    name: 'agent_config_trusted',
    type: 'boolean',
  })
  agentConfigTrusted!: boolean;

  @Column({ name: 'display_name', type: 'text' })
  displayName!: string;

  @Column({ name: 'managed', type: 'boolean' })
  managed!: boolean;

  @Column({
    default: false,
    name: 'foreign_skill_injection_enabled',
    type: 'boolean',
  })
  foreignSkillInjectionEnabled!: boolean;

  @Column({ name: 'kind', type: 'text' })
  kind!: RepositoryCheckoutKind;

  @Column({
    default: true,
    name: 'worktree_skill_overlay_enabled',
    type: 'boolean',
  })
  worktreeSkillOverlayEnabled!: boolean;

  @Column({ name: 'inspection', nullable: true, type: 'jsonb' })
  inspection!: Record<string, unknown> | null;

  @Column({
    name: 'scanned_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  scannedAt!: Date | null;
}
