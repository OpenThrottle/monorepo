/**
 * @description MCP connector connection state: list, connect (with masked
 * credential), enable/disable, disconnect. Per-user scoped. No raw secret is
 * persisted — api_token credentials are stored as a bcrypt hash + masked hint
 * (mirroring service-account credentials); oauth connections store no secret.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import {
  type McpConnectorAuthType,
  McpConnectorConnection,
} from './mcp-connector-connection.entity';
import { maskCredentialToken } from './mcp-connector-credential.util';

/** Input for {@link McpConnectorsService.connect}. */
export type ConnectMcpConnectorInput = {
  readonly apiToken?: string | null;
  readonly authType: McpConnectorAuthType;
  readonly connectorKey: string;
  readonly label?: string | null;
  readonly userId: string;
};

@Injectable()
export class McpConnectorsService {
  private static readonly DEFAULT_BCRYPT_ROUNDS = 10;

  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(McpConnectorConnection)
    private readonly connectionRepository: Repository<McpConnectorConnection>,
  ) {
    this.logger.debug('🔌 mcp-connectors 🔌');
  }

  getConnectionRepository(): Repository<McpConnectorConnection> {
    return this.connectionRepository;
  }

  /**
   * @description Connections for a user, newest first.
   */
  async findConnectionsForUser(
    userId: string,
  ): Promise<McpConnectorConnection[]> {
    return this.connectionRepository.find({
      order: { connectedAt: 'DESC' },
      where: { userId },
    });
  }

  /**
   * @description A single user's connection for a connector key, or null.
   */
  async findConnection(
    userId: string,
    connectorKey: string,
  ): Promise<McpConnectorConnection | null> {
    return this.connectionRepository.findOne({
      where: { connectorKey, userId },
    });
  }

  /**
   * @description Connects (or re-connects) a connector for a user. Upserts on
   * (userId, connectorKey): a new connection is enabled by default; re-connecting
   * refreshes the credential and re-enables. For api_token connectors the raw
   * token is hashed and a masked hint stored; the plaintext is never persisted.
   */
  async connect(
    input: ConnectMcpConnectorInput,
  ): Promise<McpConnectorConnection> {
    const trimmedToken = input.apiToken?.trim();
    const hasToken =
      input.authType === 'api_token' &&
      trimmedToken != null &&
      trimmedToken !== '';

    const credentialPrefix = hasToken
      ? maskCredentialToken(trimmedToken)
      : null;
    const credentialSecretHash = hasToken
      ? await this.hashSecret(trimmedToken)
      : null;
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
      // Only overwrite the stored credential when a new token is supplied, so a
      // bare re-enable/relabel does not wipe an existing api_token hint.
      if (hasToken) {
        existing.credentialPrefix = credentialPrefix;
        existing.credentialSecretHash = credentialSecretHash;
      } else if (input.authType === 'oauth') {
        existing.credentialPrefix = null;
        existing.credentialSecretHash = null;
      }
      return this.connectionRepository.save(existing);
    }

    return this.connectionRepository.save(
      this.connectionRepository.create({
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
   * @description Flips the `enabled` flag on a user's connection. Returns the
   * updated connection, or null when the user has no connection for that key.
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
    return this.connectionRepository.save(existing);
  }

  /**
   * @description Hard-deletes a user's connection for a connector key. Returns
   * true when a row was removed.
   */
  async disconnect(userId: string, connectorKey: string): Promise<boolean> {
    const result = await this.connectionRepository.delete({
      connectorKey,
      userId,
    });
    return (result.affected ?? 0) > 0;
  }

  /**
   * @description Hashes a credential secret with bcrypt.
   */
  async hashSecret(
    plainSecret: string,
    rounds: number = McpConnectorsService.DEFAULT_BCRYPT_ROUNDS,
  ): Promise<string> {
    return bcrypt.hash(plainSecret, rounds);
  }
}
