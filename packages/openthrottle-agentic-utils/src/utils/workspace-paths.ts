/**
 * @description Host ↔ container path mapping for the Docker host execution bridge.
 *
 * `WorkspaceLocalRepository.filesystemPath` (and plan `workingDirectory`) store
 * host-absolute paths. When OpenThrottle runs in a container with the consumer's
 * workspace root bind-mounted (e.g. `$OPENTHROTTLE_WORKSPACES_DIR` → `/workspaces`),
 * these helpers translate between the two views at the filesystem boundary. The
 * database stays host-truthful; translation happens only where paths are used.
 *
 * Both functions are identity when the env pair is unset (host-run server — all
 * existing flows). See docs/openthrottle/docker-dev-workflow-and-host-bridge.md §6.
 */

/**
 * Env var holding the workspace root path as the host knows it.
 *
 * @public
 */
export const HOST_WORKSPACES_DIR_ENV = `OPENTHROTTLE_HOST_WORKSPACES_DIR`;

/**
 * Env var holding the path the same directory is mounted at inside the container.
 *
 * @public
 */
export const CONTAINER_WORKSPACES_DIR_ENV = `OPENTHROTTLE_CONTAINER_WORKSPACES_DIR`;

/**
 * Active host↔container workspace mapping (both prefixes, no trailing slashes).
 *
 * @public
 */
export interface WorkspacePathMapping {
  readonly containerDir: string;
  readonly hostDir: string;
}

/** Drops a trailing `/` so prefix comparisons are boundary-exact (`/` itself stays). */
const stripTrailingSlash = (dir: string): string =>
  dir.length > 1 && dir.endsWith(`/`) ? dir.slice(0, -1) : dir;

/** Swaps `from` for `to` only on a whole path-segment boundary, else identity. */
const swapPrefix = (path: string, from: string, to: string): string => {
  if (path === from) return to;
  if (path.startsWith(`${from}/`)) return `${to}${path.slice(from.length)}`;
  return path;
};

/**
 * Reads the workspace path mapping from the environment. Returns undefined unless
 * BOTH {@link HOST_WORKSPACES_DIR_ENV} and {@link CONTAINER_WORKSPACES_DIR_ENV}
 * are set and non-blank (i.e. outside the container bridge this is inert).
 *
 * @public
 */
export const getWorkspacePathMapping = (
  env: NodeJS.ProcessEnv = process.env,
): WorkspacePathMapping | undefined => {
  const containerDir = env[CONTAINER_WORKSPACES_DIR_ENV]?.trim();
  const hostDir = env[HOST_WORKSPACES_DIR_ENV]?.trim();

  if (
    containerDir === undefined ||
    containerDir === `` ||
    hostDir === undefined ||
    hostDir === ``
  ) {
    return undefined;
  }

  return {
    containerDir: stripTrailingSlash(containerDir),
    hostDir: stripTrailingSlash(hostDir),
  };
};

/**
 * Translates a host-recorded absolute path to its in-container equivalent.
 * Identity when no mapping is configured or the path is outside the mapped root.
 *
 * @public
 */
export const toContainerPath = (
  path: string,
  env: NodeJS.ProcessEnv = process.env,
): string => {
  const mapping = getWorkspacePathMapping(env);
  if (mapping === undefined) return path;
  return swapPrefix(path, mapping.hostDir, mapping.containerDir);
};

/**
 * Translates an in-container path back to the host view (for display and for
 * anything handed to host-side tooling). Inverse of {@link toContainerPath}.
 *
 * @public
 */
export const toHostPath = (
  path: string,
  env: NodeJS.ProcessEnv = process.env,
): string => {
  const mapping = getWorkspacePathMapping(env);
  if (mapping === undefined) return path;
  return swapPrefix(path, mapping.containerDir, mapping.hostDir);
};
