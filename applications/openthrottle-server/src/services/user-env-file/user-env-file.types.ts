import type {
  EnsureUserEnvEntriesResult,
  InspectUserEnvEntriesResult,
  UserEnvEntries,
} from '@openthrottle/agentic-hooks';

import type {
  USER_ENV_FILE_HEALTH,
  USER_ENV_FILE_SKIP_REASONS,
} from './user-env-file.constants.ts';

export type UserEnvFileSkipReason =
  (typeof USER_ENV_FILE_SKIP_REASONS)[keyof typeof USER_ENV_FILE_SKIP_REASONS];

export interface UserEnvFileSkip {
  readonly kind: 'skip';
  readonly reason: UserEnvFileSkipReason;
}

export interface UserEnvFileWrite {
  /** Where `.env` goes; undefined means the writer's own default, `~/.openthrottle`. */
  readonly configDir: string | undefined;
  readonly entries: UserEnvEntries;
  readonly kind: 'write';
}

export type UserEnvFilePlan = UserEnvFileSkip | UserEnvFileWrite;

export interface UserEnvFileApplicable {
  /** Where `.env` goes; undefined means the writer's own default, `~/.openthrottle`. */
  readonly configDir: string | undefined;
  /** This server's loopback GraphQL URL, the endpoint the file should hold. */
  readonly graphqlUrl: string;
  readonly kind: 'applicable';
}

export type UserEnvFileScope = UserEnvFileApplicable | UserEnvFileSkip;

export interface ResolveUserEnvFileScopeParams {
  /** This process's environment, injected so the decision stays pure. */
  readonly env: NodeJS.ProcessEnv;
  /** Whether a path exists; injected so tests need no container. */
  readonly fileExists: (path: string) => boolean;
  /** The port this server listens on. */
  readonly port: number;
}

export type UserEnvFileHealthStatus =
  (typeof USER_ENV_FILE_HEALTH)[keyof typeof USER_ENV_FILE_HEALTH];

export interface UserEnvFileHealth {
  readonly endpoint: UserEnvFileHealthStatus;
  readonly token: UserEnvFileHealthStatus;
}

export interface AssessUserEnvFileParams {
  /** The endpoint this server would write (`UserEnvFileApplicable.graphqlUrl`). */
  readonly graphqlUrl: string;
  readonly inspection: InspectUserEnvEntriesResult;
  /** Whether the file's token authenticates right now; ignored when it has none. */
  readonly tokenActive: boolean;
}

export interface ResolveUserEnvFilePlanParams extends ResolveUserEnvFileScopeParams {
  /**
   * A token to write instead of this server's own `OPENTHROTTLE_MCP_AUTH_TOKEN`:
   * the plaintext of an MCP credential just minted while the server runs.
   * `undefined` means use the environment's.
   */
  readonly tokenOverride: string | undefined;
}

export interface UserEnvFileLogger {
  info(message: string): void;
  warn(message: string): void;
}

export interface EnsureUserEnvFileParams extends ResolveUserEnvFilePlanParams {
  /** The fill-in writer — `ensureUserEnvEntries` in production. */
  readonly ensure: (
    entries: UserEnvEntries,
    configDir: string | undefined,
  ) => EnsureUserEnvEntriesResult;
  readonly logger: UserEnvFileLogger;
}
