/**
 * @description Types for agent trajectories (agent_trajectories, migrations 145, 181) shared by
 * AgentTrajectoriesRepository and its callers.
 */

import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { AtifTrajectory } from '@openthrottle/openthrottle-agentic-utils';
import type { Mock } from 'vitest';

import type { EvalLabelVerdict } from '../eval-human-labels/eval-human-labels.types.ts';
import type {
  AGENT_TRAJECTORY_SOURCE,
  AgentTrajectoryScoreStateValue,
} from './agent-trajectories.constants.ts';
import type { AgentTrajectoriesRepository } from './agent-trajectories.repository.ts';
import type { AgentTrajectory } from './agent-trajectory.entity.ts';

/** @public */
export type AgentTrajectorySource =
  (typeof AGENT_TRAJECTORY_SOURCE)[keyof typeof AGENT_TRAJECTORY_SOURCE];

/**
 * @description Everything a caller supplies to record a trajectory. `costUsd` is null when the run
 * is unpriceable; that is not the same as zero. `idempotencyKey` makes recording idempotent: a
 * second create with the same non-null key returns the stored row instead of inserting.
 * @public
 */
export interface CreateAgentTrajectoryInput {
  readonly byteSize: number;
  readonly cachedTokens: number | null;
  readonly costUsd: number | null;
  readonly driver: string;
  readonly durationMs: number | null;
  readonly exitCode: number | null;
  readonly idempotencyKey: string | null;
  readonly incomplete: boolean;
  readonly inputTokens: number | null;
  readonly model: string | null;
  readonly outcome: string | null;
  readonly outputTokens: number | null;
  readonly planRunId: string;
  readonly schemaVersion: string;
  readonly source: AgentTrajectorySource;
  readonly taskId: string | null;
  readonly toolCallCount: number;
  readonly trajectory: AtifTrajectory;
  readonly truncated: boolean;
}

/**
 * @description Fields a caller may rewrite on an existing trajectory while keeping its id (so
 * human labels keyed by trajectory id survive a re-segment). `taskId`, `source` and `driver` stay
 * with the row; the document and its derived summary columns are replaced.
 * @public
 */
export interface ReplaceAgentTrajectoryInput {
  readonly byteSize: number;
  readonly cachedTokens: number | null;
  readonly costUsd: number | null;
  readonly durationMs: number | null;
  readonly exitCode: number | null;
  readonly idempotencyKey: string | null;
  readonly incomplete: boolean;
  readonly inputTokens: number | null;
  readonly model: string | null;
  readonly outcome: string | null;
  readonly outputTokens: number | null;
  readonly planRunId: string;
  readonly schemaVersion: string;
  readonly toolCallCount: number;
  readonly trajectory: AtifTrajectory;
  readonly truncated: boolean;
}

/**
 * @description Arguments to {@link AgentTrajectoriesRepository.findPlanGroups}. `rater` is the
 * caller's label identity (null when unknown, which makes every trajectory unscored);
 * `repositoryId` narrows to plans that run in one repository and `planId` to one plan (null for
 * no narrowing); `after` is the opaque `endCursor` of the previous page.
 * @public
 */
export interface FindAgentTrajectoryPlanGroupsParams {
  readonly after: string | null;
  readonly first: number;
  readonly planId: string | null;
  readonly rater: string | null;
  readonly repositoryId: string | null;
  readonly scoreState: AgentTrajectoryScoreStateValue;
}

/**
 * @description One trajectory inside a plan group: the summary columns a scoring list shows, plus
 * the caller's verdict (null when the caller has not labelled it). `taskId` and `taskTitle` are
 * null for a plan-scoped trajectory.
 * @public
 */
export interface AgentTrajectoryPlanGroupItem {
  readonly cachedTokens: number | null;
  readonly costUsd: number | null;
  readonly durationMs: number | null;
  readonly id: string;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly planRunId: string;
  readonly recordedAt: Date;
  readonly source: AgentTrajectorySource;
  readonly taskId: string | null;
  readonly taskTitle: string | null;
  readonly truncated: boolean;
  readonly verdict: EvalLabelVerdict | null;
}

/**
 * @description One plan's trajectories and its scoring progress. The counts cover every
 * trajectory in the group whatever the score-state filter; `trajectories` holds only the ones the
 * filter kept. `planId`, `planTitle` and `planStatus` are null for the one group that collects the
 * trajectories of deleted plans. `scoredCount`, `passCount` and `failCount` count the caller's
 * labels; `labelledCount` counts trajectories anyone has labelled.
 * @public
 */
export interface AgentTrajectoryPlanGroup {
  readonly failCount: number;
  readonly labelledCount: number;
  readonly latestRecordedAt: Date;
  readonly passCount: number;
  readonly planId: string | null;
  readonly planStatus: string | null;
  readonly planTitle: string | null;
  readonly scoredCount: number;
  readonly trajectories: readonly AgentTrajectoryPlanGroupItem[];
  readonly trajectoryCount: number;
}

/**
 * @description One page of plan groups, newest activity first. `endCursor` is the `after` for the
 * next page, null when the page is empty.
 * @public
 */
export interface AgentTrajectoryPlanGroupPage {
  readonly endCursor: string | null;
  readonly groups: readonly AgentTrajectoryPlanGroup[];
  readonly hasNextPage: boolean;
}

/**
 * @description What {@link AgentTrajectoriesRepository.findPlanGroups} returns: a page, or the
 * reason the request could not be served (an `after` that is not a cursor this listing issued).
 * @public
 */
export type FindAgentTrajectoryPlanGroupsResult =
  | { readonly kind: 'invalid-cursor' }
  | { readonly kind: 'page'; readonly page: AgentTrajectoryPlanGroupPage };

/**
 * @description An {@link AgentTrajectoriesRepository} mock: every inherited `BaseRepository`
 * method plus the trajectory ones.
 * @public
 */
export interface AgentTrajectoriesRepositoryMock extends BaseRepositoryMock<
  AgentTrajectory,
  CreateModelInput<AgentTrajectory>
> {
  readonly createTrajectory: Mock<
    AgentTrajectoriesRepository['createTrajectory']
  >;
  readonly findByIdempotencyKey: Mock<
    AgentTrajectoriesRepository['findByIdempotencyKey']
  >;
  readonly findByPlanRun: Mock<AgentTrajectoriesRepository['findByPlanRun']>;
  readonly findByTask: Mock<AgentTrajectoriesRepository['findByTask']>;
  readonly findPlanGroups: Mock<AgentTrajectoriesRepository['findPlanGroups']>;
  readonly findTrajectoryById: Mock<
    AgentTrajectoriesRepository['findTrajectoryById']
  >;
  readonly replaceTrajectory: Mock<
    AgentTrajectoriesRepository['replaceTrajectory']
  >;
}
