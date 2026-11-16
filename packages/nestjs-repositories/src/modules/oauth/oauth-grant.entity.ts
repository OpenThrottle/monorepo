/**
 * @description TypeORM entity for the OpenThrottle oauth_grants table. Matches databases/openthrottle/migrations/166.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { OAuthGrantRevokedReason } from './oauth.types.ts';
import type { OAuthClient } from './oauth-client.entity.ts';

@Entity('oauth_grants')
export class OAuthGrant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  /** @description FK to oauth_clients.id (not the OAuth client_id string). */
  @Column({ name: 'client_id', type: 'uuid' })
  clientRowId!: string;

  @Column({ array: true, name: 'scopes', type: 'text' })
  scopes!: string[];

  @Column({ name: 'resource', type: 'text' })
  resource!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expiresAt!: Date;

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

  @Column({ name: 'revoked_reason', nullable: true, type: 'text' })
  revokedReason!: OAuthGrantRevokedReason | null;

  @ManyToOne('OAuthClient', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: OAuthClient;
}
