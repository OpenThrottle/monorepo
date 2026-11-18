/**
 * @description TypeORM entity for the openthrottle `work_sessions` table: the append-only
 * work-ledger spine, one row per unit of work. A ledger row is never user-deleted, so it
 * extends `BaseHardDeleteModel` (no soft delete). Scalar-only: FK columns are plain uuids.
 * Its only in-place write is closing it, which stamps `ended_at`, so it has no `updated_at`.
 * Matches databases/openthrottle/migrations (068, 113, 174).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity } from 'typeorm';

import type { WorkSessionClosedBy } from './work-sessions.types.ts';

@Entity('work_sessions')
export class WorkSession extends BaseHardDeleteModel {
  @Column({ name: 'actor_service_account_id', nullable: true, type: 'uuid' })
  actorServiceAccountId!: string | null;

  @Column({ name: 'actor_user_id', nullable: true, type: 'uuid' })
  actorUserId!: string | null;

  @Column({ name: 'closed_by', nullable: true, type: 'text' })
  closedBy!: WorkSessionClosedBy | null;

  @Column({ name: 'conversation_id', nullable: true, type: 'uuid' })
  conversationId!: string | null;

  @Column({
    name: 'ended_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  endedAt!: Date | null;

  @Column({ name: 'external_ref', nullable: true, type: 'text' })
  externalRef!: string | null;

  @Column({ name: 'model', nullable: true, type: 'text' })
  model!: string | null;

  @Column({ name: 'on_behalf_of_user_id', nullable: true, type: 'uuid' })
  onBehalfOfUserId!: string | null;

  @Column({ default: false, name: 'on_behalf_of_verified', type: 'boolean' })
  onBehalfOfVerified!: boolean;

  @Column({ name: 'plan_run_id', nullable: true, type: 'uuid' })
  planRunId!: string | null;

  @Column({ name: 'started_at', type: 'timestamp with time zone' })
  startedAt!: Date;

  @Column({ name: 'summary', nullable: true, type: 'text' })
  summary!: string | null;

  @Column({ name: 'tool_name', type: 'text' })
  toolName!: string;

  @Column({ name: 'tool_version', nullable: true, type: 'text' })
  toolVersion!: string | null;
}
