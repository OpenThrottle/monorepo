/**
 * @description TypeORM entity for the `user_workspace_settings` table: one row per user holding
 * their workspace contact profile and enabled editors. Keyed by `user_id`, so it extends no base
 * model and a delete is a hard delete (a missing row is recreated empty). Matches
 * databases/openthrottle/migrations/042.
 * @public
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { User } from '../users/user.entity.ts';
import type { WorkspaceEditorId } from './user-workspace-settings.types.ts';

@Entity('user_workspace_settings')
export class UserWorkspaceSettings {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @OneToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'contact_display_name', nullable: true, type: 'text' })
  contactDisplayName!: string | null;

  @Column({ name: 'contact_email', nullable: true, type: 'text' })
  contactEmail!: string | null;

  @Column({
    default: () => "'[]'",
    name: 'enabled_editors',
    type: 'jsonb',
  })
  enabledEditors!: WorkspaceEditorId[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
