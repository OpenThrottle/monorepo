/**
 * @description TypeORM entity for the openthrottle `work_session_subjects` table: the
 * session ↔ plan/task association (`taskId` null = a plan-level subject). Append-only like
 * the rest of the work ledger, so it extends `BaseHardDeleteModel` (no soft delete).
 * `attachedAt` stays its own column beside the base `createdAt`, which migration 174
 * backfilled from it. Matches databases/openthrottle/migrations (068, 169, 174).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity } from 'typeorm';

@Entity('work_session_subjects')
export class WorkSessionSubject extends BaseHardDeleteModel {
  @Column({ name: 'attached_at', type: 'timestamp with time zone' })
  attachedAt!: Date;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId!: string;

  @Column({ name: 'task_id', nullable: true, type: 'uuid' })
  taskId!: string | null;
}
