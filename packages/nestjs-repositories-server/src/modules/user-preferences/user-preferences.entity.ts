/**
 * @description TypeORM entity for the `user_preferences` table: one row per user. Keyed by
 * `user_id`, so it extends no base model and a delete is a hard delete. Matches
 * databases/openthrottle/migrations/157. Every preference column is nullable and NULL means "use
 * the system default"; raw column values are untrusted here, so `toUserPreferencesData` narrows
 * them on read.
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

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @OneToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'default_editor', nullable: true, type: 'text' })
  defaultEditor!: string | null;

  @Column({ name: 'default_agent_backend', nullable: true, type: 'text' })
  defaultAgentBackend!: string | null;

  @Column({ name: 'default_agent_model', nullable: true, type: 'text' })
  defaultAgentModel!: string | null;

  @Column({ name: 'default_agent_effort', nullable: true, type: 'text' })
  defaultAgentEffort!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
