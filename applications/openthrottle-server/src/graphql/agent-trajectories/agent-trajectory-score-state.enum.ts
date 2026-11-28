/**
 * @description GraphQL enum for which trajectories a plan-group listing keeps, judged by the
 * caller's own label. The values come from the repository layer, so the SQL filter and the schema
 * cannot drift.
 */

import { registerEnumType } from '@nestjs/graphql';
import { AGENT_TRAJECTORY_SCORE_STATE } from '@openthrottle/nestjs-repositories-server';

registerEnumType(AGENT_TRAJECTORY_SCORE_STATE, {
  description: `Which trajectories to keep, judged by your own label: ALL, SCORED (you labelled it) or UNSCORED (still waiting on your verdict).`,
  name: 'AgentTrajectoryScoreState',
});

/**
 * @description The GraphQL enum reference — pass to `@Args` type thunks, e.g.
 * `type: () => AgentTrajectoryScoreState`. Importing it is what registers the enum.
 */
export const AgentTrajectoryScoreState = AGENT_TRAJECTORY_SCORE_STATE;
