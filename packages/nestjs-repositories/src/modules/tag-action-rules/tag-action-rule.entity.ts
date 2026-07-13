/**
 * @description TypeORM entity for tag_action_rules. Matches databases/migrations/065.
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
import type { TagActionType } from '@openthrottle/openthrottle-skills';
import { Project } from '../projects/project.entity';
import { User } from '../users/user.entity';

export interface TagActionRuleData {
  readonly actionPayload: unknown;
  readonly actionType: TagActionType;
  readonly enabled: boolean;
  readonly environment: string | null;
  readonly id: string;
  readonly projectId: string | null;
  readonly status: string | null;
  readonly tagAll: string[];
  readonly userId: string;
}

@Entity('tag_action_rules')
export class TagActionRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'project_id', nullable: true, type: 'uuid' })
  projectId!: string | null;

  @ManyToOne(() => Project, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project?: Project | null;

  @Column({ array: true, default: '{}', name: 'tag_all', type: 'text' })
  tagAll!: string[];

  @Column({ name: 'status', nullable: true, type: 'text' })
  status!: string | null;

  @Column({ name: 'environment', nullable: true, type: 'text' })
  environment!: string | null;

  @Column({ name: 'action_type', type: 'text' })
  actionType!: TagActionType;

  @Column({ name: 'action_payload', type: 'jsonb' })
  actionPayload!: unknown;

  @Column({ default: true, name: 'enabled', type: 'boolean' })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
