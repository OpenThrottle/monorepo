import type {
  EnsureUserEnvEntriesResult,
  UserEnvEntries,
} from '@openthrottle/agentic-hooks';

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
  readonly entries: UserEnvEntries;
  readonly kind: 'write';
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

export interface EnsureUserEnvFileOnBootParams extends ResolveUserEnvFilePlanParams {
  /** The fill-in writer — `ensureUserEnvEntries` in production. */
  readonly ensure: (
    entries: UserEnvEntries,
    configDir: string | undefined,
  ) => EnsureUserEnvEntriesResult;
  readonly logger: UserEnvFileLogger;
}
