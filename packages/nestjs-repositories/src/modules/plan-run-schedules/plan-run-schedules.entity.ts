/**
 * @description TypeORM entity for plan_run_schedules. Matches databases/openthrottle/migrations/163.
 * A recurrence rule for a plan; it materializes one future SCHEDULED plan_runs row at a time.
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

import { Plan } from '../plans/plan.entity.ts';
import type {
  PlanRunScheduleKind,
  PlanRunScheduleMisfirePolicy,
} from './plan-run-schedules.types.ts';

@Entity('plan_run_schedules')
export class PlanRunSchedule {
  /** Whoever created the schedule (GitHub username or principal id); null for system schedules. */
  @Column({ name: 'created_by', nullable: true, type: 'text' })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({ name: 'cron_pattern', type: 'text' })
  cronPattern!: string;

  @Column({ default: true, name: 'enabled', type: 'boolean' })
  enabled!: boolean;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ default: 'skip', name: 'misfire_policy', type: 'text' })
  misfirePolicy!: PlanRunScheduleMisfirePolicy;

  @ManyToOne(() => Plan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan?: Plan;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  /** Per-schedule overrides applied to each materialized run; `{}` means none. */
  @Column({
    default: () => `'{}'::jsonb`,
    name: 'run_overrides',
    type: 'jsonb',
  })
  runOverrides!: Record<string, unknown>;

  @Column({ default: 'cron', name: 'schedule_kind', type: 'text' })
  scheduleKind!: PlanRunScheduleKind;

  /** IANA timezone name the cron pattern is evaluated in; null means UTC. */
  @Column({ name: 'timezone', nullable: true, type: 'text' })
  timezone!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
