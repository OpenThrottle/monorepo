/**
 * @description TypeORM entity for rule_applications (the apply-once ledger).
 * Matches databases/migrations/066.
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
import { Plan } from '../plans/plan.entity';
import { Task } from '../tasks/task.entity';
import { TagActionRule } from './tag-action-rule.entity';

/**
 * @description Ledger states: applied (action performed), pre-satisfied
 * (already satisfied on first evaluation), flagged (blocked by executor
 * gating), orphaned (rule un-matched after applied; action never undone).
 * @public
 */
export const RULE_APPLICATION_STATES = {
  APPLIED: 'applied',
  FLAGGED: 'flagged',
  ORPHANED: 'orphaned',
  PRE_SATISFIED: 'pre-satisfied',
} as const;

/** @public */
export type RuleApplicationState =
  (typeof RULE_APPLICATION_STATES)[keyof typeof RULE_APPLICATION_STATES];

export interface RuleApplicationData {
  readonly details: unknown;
  readonly id: string;
  readonly planId: string;
  readonly ruleId: string;
  readonly state: RuleApplicationState;
  readonly taskId: string | null;
}

@Entity('rule_applications')
export class RuleApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'rule_id', type: 'uuid' })
  ruleId!: string;

  @ManyToOne(() => TagActionRule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rule_id' })
  rule?: TagActionRule;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @ManyToOne(() => Plan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan?: Plan;

  @Column({ name: 'task_id', nullable: true, type: 'uuid' })
  taskId!: string | null;

  @ManyToOne(() => Task, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'task_id' })
  task?: Task | null;

  @Column({ name: 'state', type: 'text' })
  state!: RuleApplicationState;

  @Column({ name: 'details', nullable: true, type: 'jsonb' })
  details!: unknown;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
