import { existsSync } from 'node:fs';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ensureUserEnvEntries,
  inspectUserEnvEntries,
} from '@openthrottle/agentic-hooks';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { ServiceAccountCredentialsRepository } from '@openthrottle/nestjs-repositories-server';

import {
  USER_ENV_FILE_HEALTH,
  USER_ENV_FILE_SERVICE_ACCOUNT_NAME,
} from './user-env-file.constants.ts';
import type { UserEnvFileHealth } from './user-env-file.types.ts';
import {
  assessUserEnvFile,
  ensureUserEnvFile,
  isUserEnvFileUnhealthy,
  readInspectedToken,
  resolveUserEnvFileScope,
} from './user-env-file.utils.ts';

/**
 * @description Keeps `~/.openthrottle/.env` current while the server runs. Boot
 * writes it once (`main.ts`); this service rewrites the managed token line
 * when an admin mints a new `openthrottle-mcp` credential, so agents in other
 * checkouts pick up a rotation without a restart, and it grades the file for
 * `serverHealth.userEnvFile` and the boot line. The same skip rules as boot
 * apply: never from a worktree server, never from a container without a mounted
 * config dir. Never reads out the token.
 */
@Injectable()
export class UserEnvFileService {
  constructor(
    private readonly configService: ConfigService,
    private readonly credentialsRepository: ServiceAccountCredentialsRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Grade `~/.openthrottle/.env` against this server: `not_applicable` where
   * the server does not own the file, else per concern. The token check is
   * read-only (no `last_used_at` bump).
   */
  async getHealth(): Promise<UserEnvFileHealth> {
    const scope = resolveUserEnvFileScope({
      env: process.env,
      fileExists: existsSync,
      port: this.port(),
    });
    if (scope.kind === 'skip') {
      return {
        endpoint: USER_ENV_FILE_HEALTH.NOT_APPLICABLE,
        token: USER_ENV_FILE_HEALTH.NOT_APPLICABLE,
      };
    }

    const inspection = inspectUserEnvEntries(scope.configDir);
    const token = readInspectedToken(inspection);
    let tokenActive = false;
    if (token !== undefined) {
      tokenActive = await this.credentialsRepository.isActiveToken(token);
    }

    return assessUserEnvFile({
      graphqlUrl: scope.graphqlUrl,
      inspection,
      tokenActive,
    });
  }

  /** One warning at boot when agents in other checkouts cannot reach this server. Never throws. */
  async logBootHealth(): Promise<void> {
    try {
      const health = await this.getHealth();
      if (
        !isUserEnvFileUnhealthy(health.endpoint) &&
        !isUserEnvFileUnhealthy(health.token)
      ) {
        return;
      }
      this.logger.warn(
        `~/.openthrottle/.env needs attention (endpoint: ${health.endpoint}, token: ${health.token}): agents in other checkouts cannot reach this server. Fix: pnpm run user-env:write (or pnpm run database:bootstrap-service-accounts).`,
        UserEnvFileService.name,
      );
    } catch (error: unknown) {
      this.logger.warn(
        `Could not check ~/.openthrottle/.env: ${error instanceof Error ? error.message : String(error)}`,
        UserEnvFileService.name,
      );
    }
  }

  /** Write `token` if it belongs to the account the file carries. Never throws. */
  onCredentialMinted(serviceAccountName: string, token: string): void {
    if (serviceAccountName !== USER_ENV_FILE_SERVICE_ACCOUNT_NAME) {
      return;
    }
    ensureUserEnvFile({
      ensure: ensureUserEnvEntries,
      env: process.env,
      fileExists: existsSync,
      logger: this.logger,
      port: this.port(),
      tokenOverride: token,
    });
  }

  private port(): number {
    return Number(this.configService.get<string>('PORT', '3000'));
  }
}
