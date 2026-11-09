/**
 * @description TypeORM entity for user_preferences. Matches databases/migrations/153.
 * One row per user; every preference column is nullable and NULL means "use the system default".
 * Raw column values are untrusted here — {@link UserPreferencesService} narrows them on read.
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

import { User } from '../users/user.entity.ts';

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
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
