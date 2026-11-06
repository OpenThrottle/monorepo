/**
 * @description Fishery factory for {@link AgentTrajectory}. Use in tests to build mock stored trajectories.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import { AGENT_TRAJECTORY_SOURCE } from './agent-trajectories.constants.ts';
import type { AgentTrajectory } from './agent-trajectory.entity.ts';

/**
 * Builds a spawned, complete, uncapped trajectory with one agent step. Override any field via
 * `.build({ costUsd: null })`.
 * @public
 */
export const agentTrajectoryFactory = Factory.define<AgentTrajectory>(() => ({
  byteSize: 256,
  cachedTokens: 0,
  costUsd: null,
  createdAt: faker.date.past(),
  driver: 'claude',
  durationMs: faker.number.int({ max: 600_000, min: 1_000 }),
  exitCode: 0,
  id: faker.string.uuid(),
  incomplete: false,
  inputTokens: faker.number.int({ max: 50_000, min: 100 }),
  model: 'claude-sonnet-5-5',
  outcome: 'completed',
  outputTokens: faker.number.int({ max: 5_000, min: 10 }),
  planRunId: faker.string.uuid(),
  schemaVersion: 'ATIF-v1.8',
  source: AGENT_TRAJECTORY_SOURCE.SPAWNED,
  taskId: null,
  toolCallCount: 0,
  trajectory: {
    agent: { name: 'claude', version: 'test' },
    schema_version: 'ATIF-v1.8',
    steps: [{ message: 'done', source: 'agent', step_id: 1 }],
  },
  truncated: false,
}));
