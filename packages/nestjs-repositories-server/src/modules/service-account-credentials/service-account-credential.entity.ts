/**
 * @description TypeORM entity for the openthrottle `service_account_credentials` table.
 * Extends `BaseHardDeleteModel`: a credential is revoked through `revoked_at`, and a deleted
 * one must really be gone, so the table has no soft delete (and no `updated_at`: the
 * lifecycle columns `last_used_at` and `revoked_at` stamp themselves). Matches
 * databases/openthrottle/migrations (044, 107, 175).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import type { ServiceAccount } from '../service-accounts/service-account.entity.ts';

@Entity('service_account_credentials')
export class ServiceAccountCredential extends BaseHardDeleteModel {
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

  @ManyToOne('ServiceAccount', 'credentials', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_account_id' })
  serviceAccount!: ServiceAccount;
}
