/**
 * @description TypeORM entity for OpenThrottle daily_stats table. Matches databases/migrations (027).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('daily_stats')
export class DailyStat {
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({ default: () => new Date(), name: 'date', type: 'date' })
  date!: Date;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    default: () => "'{}'::jsonb",
    name: 'plans_by_status',
    type: 'jsonb',
  })
  plansByStatus!: Record<string, number>;

  @Column({ default: 0, name: 'plans_created', type: 'integer' })
  plansCreated!: number;

  @Column({ default: 0, name: 'plans_completed', type: 'integer' })
  plansCompleted!: number;

  @Column({ default: 0, name: 'plans_updated', type: 'integer' })
  plansUpdated!: number;

  @Column({
    default: () => "'{}'::jsonb",
    name: 'tasks_by_status',
    type: 'jsonb',
  })
  tasksByStatus!: Record<string, number>;

  @Column({ default: 0, name: 'tasks_created', type: 'integer' })
  tasksCreated!: number;

  @Column({ default: 0, name: 'tasks_completed', type: 'integer' })
  tasksCompleted!: number;

  @Column({ default: 0, name: 'tasks_updated', type: 'integer' })
  tasksUpdated!: number;
}
