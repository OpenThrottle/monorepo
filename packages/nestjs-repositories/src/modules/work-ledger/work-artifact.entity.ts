/**
 * @description TypeORM entity for the OpenThrottle work_artifacts table. Matches databases/migrations/068.
 * Typed output produced within a work session; payload is per-type JSONB validated in app code (slice 2).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type {
  WorkArtifactSource,
  WorkArtifactVerification,
} from './work-ledger.constants';

/** Column-only shape of WorkArtifact (no relations). */
export type WorkArtifactData = Pick<
  WorkArtifact,
  | 'createdAt'
  | 'externalKey'
  | 'id'
  | 'lifecycle'
  | 'message'
  | 'producedAt'
  | 'sessionId'
  | 'source'
  | 'type'
  | 'verification'
  | 'verifiedAt'
> & { payload: Record<string, unknown> };

@Entity('work_artifacts')
export class WorkArtifact {
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({ name: 'external_key', type: 'text' })
  externalKey!: string;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

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
