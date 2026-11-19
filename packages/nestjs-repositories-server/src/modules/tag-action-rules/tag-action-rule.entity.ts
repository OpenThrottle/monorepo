/**
 * @description TypeORM entity for the openthrottle `tag_action_rules` table: a user-owned
 * declarative tag to action rule. Extends `BaseModel`, so a delete is a soft delete: a
 * soft-deleted rule no longer evaluates and keeps its `rule_applications` ledger rows.
 * Matches databases/openthrottle/migrations (065, 072, 179).
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import type { TagActionType } from '@openthrottle/openthrottle-skills';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { PLAN_STATUS_VALUES } from '../../plan-task-status/plan-task-status.constants.ts';
import type { Project } from '../projects/project.entity.ts';
import type { User } from '../users/user.entity.ts';

@Entity('tag_action_rules')
export class TagActionRule extends BaseModel {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'project_id', nullable: true, type: 'uuid' })
  projectId!: string | null;

  @ManyToOne('Project', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project?: Project | null;

  @Column({ name: 'title', type: 'text' })
  title!: string;

  @Column({
    array: true,
    default: () => "'{}'",
    name: 'tag_all',
    type: 'text',
  })
  tagAll!: string[];

  @Column({
    enum: [...PLAN_STATUS_VALUES],
    enumName: 'plan_task_status',
    name: 'status',
    nullable: true,
    type: 'enum',
  })
  status!: string | null;

  @Column({ name: 'environment', nullable: true, type: 'text' })
  environment!: string | null;

  @Column({ name: 'action_type', type: 'text' })
  actionType!: TagActionType;

  @Column({ name: 'action_payload', type: 'jsonb' })
  actionPayload!: unknown;

  @Column({ default: true, name: 'enabled', type: 'boolean' })
  enabled!: boolean;
}
