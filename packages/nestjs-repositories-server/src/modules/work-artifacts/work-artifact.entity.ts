/**
 * @description TypeORM entity for the openthrottle `work_artifacts` table: a typed output
 * produced within a work session, with a per-type JSONB payload validated in app code.
 * Append-only like the rest of the work ledger, so it extends `BaseHardDeleteModel` (no soft
 * delete). Its in-place writes (the verifier's verification and lifecycle) stamp
 * `verified_at`, so it has no `updated_at`. Matches databases/openthrottle/migrations (068,
 * 119, 174).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity } from 'typeorm';

import type {
  WorkArtifactSource,
  WorkArtifactVerification,
} from './work-artifacts.types.ts';

@Entity('work_artifacts')
export class WorkArtifact extends BaseHardDeleteModel {
  @Column({ name: 'external_key', type: 'text' })
  externalKey!: string;

  @Column({ name: 'lifecycle', nullable: true, type: 'text' })
  lifecycle!: string | null;

  @Column({ name: 'message', nullable: true, type: 'text' })
  message!: string | null;

  @Column({ name: 'payload', type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ name: 'produced_at', type: 'timestamp with time zone' })
  producedAt!: Date;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId!: string;

  @Column({ name: 'source', type: 'text' })
  source!: WorkArtifactSource;

  @Column({ name: 'type', type: 'text' })
  type!: string;

  @Column({ default: 'unverified', name: 'verification', type: 'text' })
  verification!: WorkArtifactVerification;

  @Column({
    name: 'verified_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  verifiedAt!: Date | null;
}
