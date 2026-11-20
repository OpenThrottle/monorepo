import type {
  EnsureUserEnvEntriesResult,
  UserEnvEntries,
} from '@openthrottle/agentic-hooks';
import type {
  ServiceAccountCredentialsRepository,
  ServiceAccountsRepository,
} from '@openthrottle/nestjs-repositories-server';

import type { USER_ENV_FILE_SKIP_REASONS } from './user-env-file.constants.ts';

export type UserEnvFileSkipReason =
  (typeof USER_ENV_FILE_SKIP_REASONS)[keyof typeof USER_ENV_FILE_SKIP_REASONS];

export interface UserEnvFileSkip {
  readonly kind: 'skip';
  readonly reason: UserEnvFileSkipReason;
}

export interface UserEnvFileWrite {
  /** Where `.env` goes; undefined means the writer's own default, `~/.openthrottle`. */
  readonly configDir: string | undefined;
  /** This server's loopback GraphQL URL. */
  readonly graphqlUrl: string;
  readonly kind: 'write';
  /**
   * This server's `OPENTHROTTLE_MCP_AUTH_TOKEN`. Never written: the file gets the
   * telemetry-only token derived from it.
   */
  readonly parentToken: string;
}

export type UserEnvFilePlan = UserEnvFileSkip | UserEnvFileWrite;

export interface ResolveUserEnvFilePlanParams {
  /** This process's environment, injected so the decision stays pure. */
  readonly env: NodeJS.ProcessEnv;
  /** Whether a path exists; injected so tests need no container. */
  readonly fileExists: (path: string) => boolean;
  /** The port this server listens on. */
  readonly port: number;
}

export interface UserEnvFileLogger {
  info(message: string): void;
  warn(message: string): void;
}

export interface ProvisionTelemetryIngestTokenParams {
  readonly credentials: Pick<
    ServiceAccountCredentialsRepository,
    'upsertTelemetryIngestCredential'
  >;
  /** This server's `OPENTHROTTLE_MCP_AUTH_TOKEN`. */
  readonly parentToken: string;
  readonly serviceAccounts: Pick<ServiceAccountsRepository, 'findByName'>;
}

/** What provisioning the telemetry-only credential came to. */
export type ProvisionTelemetryTokenResult =
  | { readonly kind: 'failed'; readonly reason: string }
  | { readonly kind: 'provisioned'; readonly token: string };

export interface EnsureUserEnvFileOnBootParams extends ResolveUserEnvFilePlanParams {
  /** The fill-in writer — `ensureUserEnvEntries` in production. */
  readonly ensure: (
    entries: UserEnvEntries,
    configDir: string | undefined,
  ) => EnsureUserEnvEntriesResult;
  readonly logger: UserEnvFileLogger;
  /**
   * Upserts the `telemetry:ingest` credential derived from the MCP token and returns
   * the token to write. May reject; the boot step stays fail-open.
   */
  readonly provisionTelemetryToken: (
    parentToken: string,
  ) => Promise<ProvisionTelemetryTokenResult>;
}
