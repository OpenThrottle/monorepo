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

export type AgentTrajectorySourceKey = keyof typeof AGENT_TRAJECTORY_SOURCE;
export type AgentTrajectorySourceValue =
  (typeof AGENT_TRAJECTORY_SOURCE)[AgentTrajectorySourceKey];

/**
 * Which trajectories a plan-group listing keeps, judged by the caller's own label: every one,
 * only those the caller has scored, or only those still waiting on the caller's verdict.
 * @public
 */
export const AGENT_TRAJECTORY_SCORE_STATE = {
  ALL: 'all',
  SCORED: 'scored',
  UNSCORED: 'unscored',
} as const;

export type AgentTrajectoryScoreStateKey =
  keyof typeof AGENT_TRAJECTORY_SCORE_STATE;
export type AgentTrajectoryScoreStateValue =
  (typeof AGENT_TRAJECTORY_SCORE_STATE)[AgentTrajectoryScoreStateKey];
