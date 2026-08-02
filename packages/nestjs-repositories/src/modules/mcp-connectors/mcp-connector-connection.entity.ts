/**
 * @description TypeORM entity for OpenThrottle mcp_connector_connections table. Matches databases/migrations/084.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Auth mechanism a connector uses, denormalized onto the connection row at
 * connect time. `as const` (no TS enum) — mirrors the catalog seed's authType.
 */
export const MCP_CONNECTOR_AUTH_TYPES = ['api_token', 'oauth'] as const;

/** Auth mechanism for an MCP connector connection. */
export type McpConnectorAuthType = (typeof MCP_CONNECTOR_AUTH_TYPES)[number];

/** Scalar/column fields of McpConnectorConnection (no relations). */
export type McpConnectorConnectionData = Pick<
  McpConnectorConnection,
  | 'authType'
  | 'connectedAt'
  | 'connectorKey'
  | 'createdAt'
  | 'credentialLabel'
  | 'credentialPrefix'
  | 'credentialSecretHash'
  | 'enabled'
  | 'id'
  | 'lastUsedAt'
  | 'updatedAt'
  | 'userId'
>;

@Entity('mcp_connector_connections')
export class McpConnectorConnection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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

  @Column({
    name: 'connected_at',
    type: 'timestamp with time zone',
  })
  connectedAt!: Date;

  @Column({
    name: 'last_used_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  lastUsedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
