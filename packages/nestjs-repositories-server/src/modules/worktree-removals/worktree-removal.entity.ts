/**
 * @description TypeORM entity for the openthrottle `worktree_removals` table: one append-only
 * row per post-removal deregisterWorktreeCheckout call that carried ot-worktree's removal audit.
 * Extends `BaseHardDeleteModel` (no soft delete). Matches databases/openthrottle/migrations
 * (165, 170).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity } from 'typeorm';

@Entity('worktree_removals')
export class WorktreeRemoval extends BaseHardDeleteModel {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'repository_id', nullable: true, type: 'uuid' })
  repositoryId!: string | null;

  @Column({ name: 'checkout_id', nullable: true, type: 'uuid' })
  checkoutId!: string | null;

  @Column({ name: 'filesystem_path', type: 'text' })
  filesystemPath!: string;

  @Column({ type: 'text' })
  outcome!: string;

  @Column({ nullable: true, type: 'text' })
  result!: string | null;

  @Column({ nullable: true, type: 'text' })
  branch!: string | null;

  @Column({ nullable: true, type: 'text' })
  probe!: string | null;

  @Column({ nullable: true, type: 'integer' })
  pid!: number | null;

  @Column({ nullable: true, type: 'integer' })
  ppid!: number | null;

  @Column({ name: 'parent_command', nullable: true, type: 'text' })
  parentCommand!: string | null;

  @Column({ nullable: true, type: 'text' })
  ancestry!: string | null;

  @Column({ name: 'agent_session', nullable: true, type: 'text' })
  agentSession!: string | null;

  @Column({
    name: 'removed_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  removedAt!: Date | null;
}
