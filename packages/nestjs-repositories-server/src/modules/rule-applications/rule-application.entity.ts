/**
 * @description TypeORM entity for the openthrottle `rule_applications` table, the apply-once
 * ledger of tag-action rules. Extends `BaseHardDeleteModel`: a ledger row is never
 * user-deleted (it goes only with its plan), and it keeps its own `updated_at` because its
 * state is written in place (applied to orphaned). Soft-deleting a rule keeps its ledger rows.
 * Matches databases/openthrottle/migrations (066, 179).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';

import type { Plan } from '../plans/plan.entity.ts';
import type { TagActionRule } from '../tag-action-rules/tag-action-rule.entity.ts';
import type { Task } from '../tasks/task.entity.ts';
import type { RuleApplicationState } from './rule-applications.types.ts';

@Entity('rule_applications')
export class RuleApplication extends BaseHardDeleteModel {
  @Column({ name: 'rule_id', type: 'uuid' })
  ruleId!: string;

  @ManyToOne('TagActionRule', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rule_id' })
  rule?: TagActionRule;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @ManyToOne('Plan', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan?: Plan;

  @Column({ name: 'task_id', nullable: true, type: 'uuid' })
  taskId!: string | null;

  @ManyToOne('Task', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'task_id' })
  task?: Task | null;

  @Column({ name: 'state', type: 'text' })
  state!: RuleApplicationState;

  @Column({ name: 'details', nullable: true, type: 'jsonb' })
  details!: unknown;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
