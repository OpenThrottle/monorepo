/** Why the boot step left `~/.openthrottle/.env` alone. */
export const USER_ENV_FILE_SKIP_REASONS = Object.freeze({
  /** A container whose home directory is not the host's, with no host dir mounted in. */
  CONTAINER: 'container',
  /** `PORT` is not a usable port number, so there is no URL to write. */
  NO_PORT: 'no_port',
  /** No `OPENTHROTTLE_MCP_AUTH_TOKEN` in this server's environment to hand out. */
  NO_TOKEN: 'no_token',
  /** A worktree server (`OT_WORKTREE_DB` set): it disappears with its worktree. */
  WORKTREE: 'worktree',
} as const);

/** Docker and Podman container marker files. */
export const USER_ENV_FILE_CONTAINER_MARKERS = Object.freeze([
  '/.dockerenv',
  '/run/.containerenv',
] as const);

/**
 * Point the boot step at a directory other than `~/.openthrottle`. The
 * Docker-native install bind-mounts the host's `~/.openthrottle` into the server
 * container and names the mount here; setting it also lifts the container skip,
 * since the directory it names IS the host's.
 */
export const USER_ENV_FILE_CONFIG_DIR_ENV = 'OPENTHROTTLE_USER_CONFIG_DIR';

/**
 * The service account whose token the file carries. A credential minted for it
 * while the server runs is written straight to the file (`UserEnvFileService`).
 */
export const USER_ENV_FILE_SERVICE_ACCOUNT_NAME = 'openthrottle-mcp';

/** How `~/.openthrottle/.env` looks to this server, per concern (endpoint, token). */
export const USER_ENV_FILE_HEALTH = Object.freeze({
  /** Nothing in the file for this concern: agents in other checkouts cannot reach OT. */
  MISSING: 'missing',
  /** This server does not own the file (worktree, container without a mounted dir, no port). */
  NOT_APPLICABLE: 'not_applicable',
  /** The managed line matches this server (endpoint) or authenticates (token). */
  OK: 'ok',
  /** A managed endpoint for another port, or a token that no longer authenticates. */
  STALE: 'stale',
  /** The file exists but could not be read. */
  UNREADABLE: 'unreadable',
  /** The user set it; the writer leaves it alone (a user-set token is still checked). */
  USER_SET: 'user_set',
} as const);
