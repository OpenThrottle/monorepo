/**
 * @description TypeORM entity for the OpenThrottle work_sessions table. Matches databases/migrations/068.
 * Scalar-only (like PlanRun); FK columns are plain uuids — relations are added when a resolver needs them.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { WorkSessionClosedBy } from './work-ledger.constants';

/** Column-only shape of WorkSession (no relations). */
export type WorkSessionData = Pick<
  WorkSession,
  | 'actorServiceAccountId'
  | 'actorUserId'
  | 'closedBy'
  | 'conversationId'
  | 'createdAt'
  | 'endedAt'
  | 'externalRef'
  | 'id'
  | 'model'
  | 'onBehalfOfUserId'
  | 'onBehalfOfVerified'
  | 'planRunId'
  | 'startedAt'
  | 'summary'
  | 'toolName'
  | 'toolVersion'
>;

@Entity('work_sessions')
export class WorkSession {
  @Column({ name: 'actor_service_account_id', nullable: true, type: 'uuid' })
  actorServiceAccountId!: string | null;

  @Column({ name: 'actor_user_id', nullable: true, type: 'uuid' })
  actorUserId!: string | null;

  @Column({ name: 'closed_by', nullable: true, type: 'text' })
  closedBy!: WorkSessionClosedBy | null;

  @Column({ name: 'conversation_id', nullable: true, type: 'uuid' })
  conversationId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({
    name: 'ended_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  endedAt!: Date | null;

  @Column({ name: 'external_ref', nullable: true, type: 'text' })
  externalRef!: string | null;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

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
