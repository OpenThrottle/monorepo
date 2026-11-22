/**
 * @description TypeORM entity for the OpenThrottle oauth_clients table. Matches databases/openthrottle/migrations/191.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { OAuthRegistrationKind } from './oauth.types.ts';

@Entity('oauth_clients')
export class OAuthClient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'client_id', type: 'text' })
  clientId!: string;

  @Column({ name: 'registration_kind', type: 'text' })
  registrationKind!: OAuthRegistrationKind;

  @Column({ name: 'client_name', nullable: true, type: 'text' })
  clientName!: string | null;

  @Column({ name: 'client_uri', nullable: true, type: 'text' })
  clientUri!: string | null;

  @Column({ name: 'logo_uri', nullable: true, type: 'text' })
  logoUri!: string | null;

  @Column({ array: true, name: 'redirect_uris', type: 'text' })
  redirectUris!: string[];

  @Column({
    name: 'metadata_fetched_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  metadataFetchedAt!: Date | null;

  @Column({
    name: 'last_used_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  lastUsedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}
