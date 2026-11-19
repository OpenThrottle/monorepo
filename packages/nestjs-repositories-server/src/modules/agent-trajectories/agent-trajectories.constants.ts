/**
 * @description String literals written to `agent_trajectories.source` (CHECK-constrained TEXT,
 * migration 145). The SQL CHECK and this object must list the same values.
 * @public
 */

/**
 * How a trajectory was captured: `spawned` by the OpenThrottle runner, or `session_upload` from an
 * interactive session's Stop hook.
 * @public
 */
export const AGENT_TRAJECTORY_SOURCE = {
  SESSION_UPLOAD: 'session_upload',
  SPAWNED: 'spawned',
} as const;
