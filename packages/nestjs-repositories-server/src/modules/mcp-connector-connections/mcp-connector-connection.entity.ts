/**
 * @description TypeORM entity for the openthrottle `mcp_connector_connections` table: a user's
 * connect/enable state for one connector of the curated MCP catalog, plus a masked credential
 * hint (never a raw secret). Extends `BaseModel`, so a disconnect soft deletes. Matches
 * databases/openthrottle/migrations (084, 171).
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity } from 'typeorm';

import type { McpConnectorAuthType } from './mcp-connector-connections.types.ts';

@Entity('mcp_connector_connections')
export class McpConnectorConnection extends BaseModel {
  @Column({ name: 'connector_key', type: 'text' })
  connectorKey!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'enabled', type: 'boolean' })
  enabled!: boolean;

  @Column({ name: 'auth_type', type: 'text' })
  authType!: McpConnectorAuthType;

  @Column({ name: 'credential_prefix', nullable: true, type: 'text' })
  credentialPrefix!: string | null;

  @Column({ name: 'credential_secret_hash', nullable: true, type: 'text' })
  credentialSecretHash!: string | null;

  @Column({ name: 'credential_label', nullable: true, type: 'text' })
  credentialLabel!: string | null;

  @Column({ name: 'connected_at', type: 'timestamp with time zone' })
  connectedAt!: Date;

  @Column({
    name: 'last_used_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  lastUsedAt!: Date | null;
}
