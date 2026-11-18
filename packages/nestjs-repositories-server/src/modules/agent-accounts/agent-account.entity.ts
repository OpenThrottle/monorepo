/**
 * @description TypeORM entity for the openthrottle `agent_accounts` table: one row per (user,
 * provider, external account), the agent-CLI login a usage row was billed to. The usage writers
 * upsert it on every sighting, and a deleted row is simply recreated on the next one, so it
 * extends `BaseHardDeleteModel`. `created_at` equals `first_seen_at`, which stays the column its
 * consumers read. Matches databases/openthrottle/migrations (158, 177).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import type { User } from '../users/user.entity.ts';

@Entity('agent_accounts')
export class AgentAccount extends BaseHardDeleteModel {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'provider', type: 'text' })
  provider!: string;

  @Column({ name: 'external_account_id', type: 'text' })
  externalAccountId!: string;

  @Column({ name: 'email', nullable: true, type: 'text' })
  email!: string | null;

  @Column({ name: 'org_id', nullable: true, type: 'text' })
  orgId!: string | null;

  @Column({ name: 'org_name', nullable: true, type: 'text' })
  orgName!: string | null;

  @Column({ name: 'plan', nullable: true, type: 'text' })
  plan!: string | null;

  @Column({ default: 'unknown', name: 'credential_kind', type: 'text' })
  credentialKind!: string;

  @Column({ name: 'first_seen_at', type: 'timestamp with time zone' })
  firstSeenAt!: Date;

  @Column({ name: 'last_seen_at', type: 'timestamp with time zone' })
  lastSeenAt!: Date;
}
