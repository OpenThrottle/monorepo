/**
 * @description TypeORM entity for worktree_removals. Matches
 * databases/openthrottle/migrations/165_create_worktree_removals.sql. One append-only row per
 * post-removal deregisterWorktreeCheckout call that carried ot-worktree's removal audit.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('worktree_removals')
export class WorktreeRemoval {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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

  @Column({ nullable: true, type: 'int' })
  pid!: number | null;

  @Column({ nullable: true, type: 'int' })
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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}
