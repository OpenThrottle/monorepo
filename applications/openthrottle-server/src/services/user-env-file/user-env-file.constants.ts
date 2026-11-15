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
