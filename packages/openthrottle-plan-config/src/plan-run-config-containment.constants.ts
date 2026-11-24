/**
 * @description Constants for the per-run containment profile (`runConfigJson.containment`).
 * Driver support and the reasoning behind each default host are recorded in plan
 * 01a204c6-e136-7d15-8456-6ecbdbc3da4e and the drivers capability matrix.
 */

/** @description Filesystem boundary modes: writes limited to the run's worktree, or no OT-imposed limit. */
export const PLAN_RUN_CONTAINMENT_FILESYSTEM_MODES = [
  'unrestricted',
  'worktree-write',
] as const;

/** @description Network boundary modes: no egress, a host allowlist, or no OT-imposed limit. */
export const PLAN_RUN_CONTAINMENT_NETWORK_MODES = [
  'allowlist',
  'deny',
  'unrestricted',
] as const;

/**
 * @description Hosts every unattended run on a pnpm + GitHub repository needs. Each one is a
 * capability grant, not a destination filter: with a GitHub token present, `api.github.com` and
 * `github.com` allow every action that token can take on every repository it reaches. The OT API
 * host and the CLI's own model provider are added by the spawning consumer, which knows them.
 */
export const DEFAULT_PLAN_RUN_CONTAINMENT_HOSTS = [
  'api.github.com',
  'codeload.github.com',
  'github.com',
  'objects.githubusercontent.com',
  'registry.npmjs.org',
] as const;

/** @description Most hosts accepted in one allowlist. */
export const MAX_PLAN_RUN_CONTAINMENT_HOSTS = 100;

/** @description Longest host name accepted (DNS limit). */
export const MAX_PLAN_RUN_CONTAINMENT_HOST_LEN = 253;

/**
 * @description A bare host name, optionally with one leading `*.` wildcard label. No scheme, port
 * or path: every native sandbox that takes an allowlist matches on host only.
 */
export const PLAN_RUN_CONTAINMENT_HOST_REGEX =
  /^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;
