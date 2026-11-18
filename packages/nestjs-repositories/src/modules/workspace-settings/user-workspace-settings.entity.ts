/**
 * @description TypeORM entity for user_workspace_settings. Matches databases/openthrottle/migrations/042.
 */

import { User } from '@openthrottle/nestjs-repositories-server';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { WorkspaceEditorId } from './workspace-settings.types.ts';

export interface UserWorkspaceSettingsData {
  readonly contactDisplayName: string | null;
  readonly contactEmail: string | null;
  readonly enabledEditors: readonly WorkspaceEditorId[];
  readonly userId: string;
}

@Entity('user_workspace_settings')
export class UserWorkspaceSettings {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
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
