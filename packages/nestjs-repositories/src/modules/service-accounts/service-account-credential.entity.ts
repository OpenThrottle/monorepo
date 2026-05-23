/**
 * @description TypeORM entity for Cortex service_account_credentials table. Matches databases/migrations/044.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ServiceAccount } from './service-account.entity';

/** Scalar/column fields of ServiceAccountCredential (no relations). */
export type ServiceAccountCredentialData = Pick<
  ServiceAccountCredential,
  | 'createdAt'
  | 'expiresAt'
  | 'id'
  | 'label'
  | 'lastUsedAt'
  | 'prefix'
  | 'revokedAt'
  | 'secretHash'
  | 'serviceAccountId'
>;

@Entity('service_account_credentials')
export class ServiceAccountCredential {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'service_account_id', type: 'uuid' })
  serviceAccountId!: string;

  @Column({ name: 'prefix', type: 'text' })
  prefix!: string;

  @Column({ name: 'secret_hash', type: 'text' })
  secretHash!: string;

  @Column({ name: 'label', nullable: true, type: 'text' })
  label!: string | null;

  @Column({
    name: 'expires_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  expiresAt!: Date | null;

  @Column({
    name: 'last_used_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  lastUsedAt!: Date | null;

  @Column({
    name: 'revoked_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToOne('ServiceAccount', 'credentials', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_account_id' })
  serviceAccount!: ServiceAccount;
}
