/**
 * @description TypeORM entity for repository_checkouts. Matches databases/migrations/078.
 * A checkout is a per-user on-disk instance of a repository; the row is a cache over
 * the manifest and git state actually on disk (disk is the source of truth).
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
import { User } from '../users/user.entity';
import { Repository } from './repository.entity';

export const REPOSITORY_CHECKOUT_KINDS = ['primary', 'worktree'] as const;

export type RepositoryCheckoutKind = (typeof REPOSITORY_CHECKOUT_KINDS)[number];

export interface RepositoryCheckoutData {
  readonly displayName: string;
  readonly filesystemPath: string;
  readonly foreignSkillInjectionEnabled: boolean;
  readonly id: string;
  readonly kind: RepositoryCheckoutKind;
  readonly managed: boolean;
  readonly repositoryId: string;
  readonly scannedAt: Date | null;
  readonly userId: string;
}

@Entity('repository_checkouts')
export class RepositoryCheckout {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'repository_id', type: 'uuid' })
  repositoryId!: string;

  @ManyToOne(() => Repository, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'repository_id' })
  repository?: Repository;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'filesystem_path', type: 'text' })
  filesystemPath!: string;

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

  @Column({ name: 'inspection', nullable: true, type: 'jsonb' })
  inspection!: Record<string, unknown> | null;

  @Column({
    name: 'scanned_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  scannedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
