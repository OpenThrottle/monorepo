/**
 * @description TypeORM entity for the OpenThrottle oauth_tokens table. Matches databases/openthrottle/migrations/166.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { OAuthTokenKind } from './oauth.types.ts';
import type { OAuthGrant } from './oauth-grant.entity.ts';

@Entity('oauth_tokens')
export class OAuthToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'grant_id', type: 'uuid' })
  grantId!: string;

  @Column({ name: 'kind', type: 'text' })
  kind!: OAuthTokenKind;

  @Column({ name: 'prefix', type: 'text' })
  prefix!: string;

  @Column({ name: 'secret_hash', type: 'text' })
  secretHash!: string;

  @Column({ name: 'expires_at', type: 'timestamp with time zone' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @Column({
    name: 'revoked_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  revokedAt!: Date | null;

  @Column({ name: 'replaced_by', nullable: true, type: 'uuid' })
  replacedBy!: string | null;

  @ManyToOne('OAuthGrant', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'grant_id' })
  grant!: OAuthGrant;
}
