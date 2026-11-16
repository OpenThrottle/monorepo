/**
 * @description TypeORM entity for the OpenThrottle oauth_authorization_requests table. Matches databases/openthrottle/migrations/166.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { OAuthAuthorizationRequestStatus } from './oauth.types.ts';
import type { OAuthClient } from './oauth-client.entity.ts';

@Entity('oauth_authorization_requests')
export class OAuthAuthorizationRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** @description FK to oauth_clients.id (not the OAuth client_id string). */
  @Column({ name: 'client_id', type: 'uuid' })
  clientRowId!: string;

  @Column({ name: 'redirect_uri', type: 'text' })
  redirectUri!: string;

  @Column({ name: 'state', nullable: true, type: 'text' })
  state!: string | null;

  @Column({ name: 'code_challenge', type: 'text' })
  codeChallenge!: string;

  @Column({ array: true, name: 'requested_scopes', type: 'text' })
  requestedScopes!: string[];

  @Column({ name: 'resource', type: 'text' })
  resource!: string;

  @Column({ name: 'user_id', nullable: true, type: 'uuid' })
  userId!: string | null;

  @Column({ array: true, name: 'granted_scopes', nullable: true, type: 'text' })
  grantedScopes!: string[] | null;

  @Column({ name: 'code_hash', nullable: true, type: 'text' })
  codeHash!: string | null;

  @Column({ name: 'grant_id', nullable: true, type: 'uuid' })
  grantId!: string | null;

  @Column({ name: 'status', type: 'text' })
  status!: OAuthAuthorizationRequestStatus;

  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({
    name: 'decided_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  decidedAt!: Date | null;

  @ManyToOne('OAuthClient', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client!: OAuthClient;
}
