import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { maskCredentialToken } from './credential-mask/credential-mask.utils.ts';
import { McpConnectorConnection } from './mcp-connector-connection.entity.ts';
import type { ConnectMcpConnectorInput } from './mcp-connector-connections.types.ts';

/** bcrypt cost for an api_token credential hash, mirroring service-account credentials. */
const BCRYPT_ROUNDS = 10;

/**
 * @description Data access for the openthrottle `mcp_connector_connections` table on the
 * default connection: the `BaseRepository` CRUD plus the per-user connect, enable and
 * disconnect flows. A disconnect soft deletes, and a reconnect after it inserts a fresh row
 * (the unique index on (user_id, connector_key) covers live rows only). No raw secret is
 * persisted: an api_token is stored as a bcrypt hash plus a masked hint; oauth stores none.
 * @public
 */
@Injectable()
export class McpConnectorConnectionsRepository extends BaseRepository<
  McpConnectorConnection,
  CreateModelInput<McpConnectorConnection>
> {
  protected readonly tableName = 'mcp_connector_connections';

  constructor(
    @InjectRepository(McpConnectorConnection)
    repository: Repository<McpConnectorConnection>,
  ) {
    super(repository);
  }

  /** @description A user's live connections, newest first. */
  async findConnectionsForUser(
    userId: string,
  ): Promise<McpConnectorConnection[]> {
    return this.findBy({ order: { connectedAt: 'DESC' }, where: { userId } });
  }

  /** @description A user's live connection for a connector key, or null. */
  async findConnection(
    userId: string,
    connectorKey: string,
  ): Promise<McpConnectorConnection | null> {
    return this.findOne({ where: { connectorKey, userId } });
  }

  /**
   * @description Connects (or re-connects) a connector for a user. A user with a live
   * connection for the key has it refreshed and re-enabled; otherwise a new enabled row is
   * inserted, which is also what reconnecting after a disconnect does. A bare re-enable with
   * no new token keeps an existing api_token hint.
   */
  async connect(
    input: ConnectMcpConnectorInput,
  ): Promise<McpConnectorConnection> {
    const trimmedToken = input.apiToken?.trim();
    const token =
      input.authType === 'api_token' && trimmedToken ? trimmedToken : null;

    const credentialPrefix = token === null ? null : maskCredentialToken(token);
    const credentialSecretHash =
      token === null ? null : await bcrypt.hash(token, BCRYPT_ROUNDS);
    const credentialLabel = input.label?.trim() || null;

    const existing = await this.findConnection(
      input.userId,
      input.connectorKey,
    );

    if (existing) {
      existing.authType = input.authType;
      existing.enabled = true;
      existing.connectedAt = new Date();
      existing.credentialLabel = credentialLabel;
      if (token !== null) {
        existing.credentialPrefix = credentialPrefix;
        existing.credentialSecretHash = credentialSecretHash;
      } else if (input.authType === 'oauth') {
        existing.credentialPrefix = null;
        existing.credentialSecretHash = null;
      }
      return this.repository.save(existing);
    }

    return this.repository.save(
      this.repository.create({
        authType: input.authType,
        connectedAt: new Date(),
        connectorKey: input.connectorKey,
        credentialLabel,
        credentialPrefix,
        credentialSecretHash,
        enabled: true,
        userId: input.userId,
      }),
    );
  }

  /**
   * @description Flips `enabled` on a user's live connection. Returns the updated connection,
   * or null when the user has no live connection for that key.
   */
  async setEnabled(
    userId: string,
    connectorKey: string,
    enabled: boolean,
  ): Promise<McpConnectorConnection | null> {
    const existing = await this.findConnection(userId, connectorKey);
    if (!existing) {
      return null;
    }
    existing.enabled = enabled;
    return this.repository.save(existing);
  }

  /**
   * @description Soft deletes a user's live connection for a connector key. Returns true when
   * a live row was disconnected.
   */
  async disconnect(userId: string, connectorKey: string): Promise<boolean> {
    const { removedCount } = await this.removeMany({ connectorKey, userId });
    return removedCount > 0;
  }
}
