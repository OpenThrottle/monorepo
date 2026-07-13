/**
 * @description TypeORM entity for the OpenThrottle work_session_subjects table. Matches databases/migrations/068.
 * Session ↔ plan/task association; task_id NULL = plan-level subject.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Column-only shape of WorkSessionSubject (no relations). */
export type WorkSessionSubjectData = Pick<
  WorkSessionSubject,
  'attachedAt' | 'id' | 'planId' | 'sessionId' | 'taskId'
>;

@Entity('work_session_subjects')
export class WorkSessionSubject {
  @CreateDateColumn({ name: 'attached_at', type: 'timestamp with time zone' })
  attachedAt!: Date;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId!: string;

  @Column({ name: 'task_id', nullable: true, type: 'uuid' })
  taskId!: string | null;
}
