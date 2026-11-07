/**
 * @description Trajectory fixtures for the evals specs and the route harness.
 * One document exercises every rendering branch the viewer has: a long user
 * prompt, reasoning, a successful call, an error call, a call rebuilt from its
 * result, an Agent call whose result names its subagent, a system hand-back
 * that links that subagent, a background-task system notice, a result that
 * names no call, a subagent nothing mentions, and run-level errors. Steps cover
 * all three ATIF sources (user, agent, system).
 */
import type {
  AgentTrajectoryLabelRowFragment,
  AgentTrajectorySummaryFragment,
} from '~/__generated__/graphql';
import type { AtifStep, AtifTrajectory } from '~/routing/evals/types';

const LONG_PROMPT = Array.from({ length: 10 }, (_, index) => {
  return `Prompt line ${index + 1}: implement the trajectory viewer.`;
}).join('\n');

const LONG_OBSERVATION = Array.from({ length: 40 }, (_, index) => {
  return `${index + 1}\tconst value${index} = ${index};`;
}).join('\n');

export const MOCK_SUBAGENT_ID = 'a1b2c3d4';

export const MOCK_ORPHAN_SUBAGENT_ID = 'orphan-9';

export const MOCK_SUBAGENT: AtifTrajectory = {
  agent: { name: 'claude-code', version: '2.1.0' },
  schema_version: 'ATIF-v1.8',
  steps: [
    { message: 'Find every route module.', source: 'user', step_id: 1 },
    {
      message: 'Found 112 route modules.',
      source: 'agent',
      step_id: 2,
    },
  ],
  trajectory_id: MOCK_SUBAGENT_ID,
};

export const MOCK_ORPHAN_SUBAGENT: AtifTrajectory = {
  agent: { name: 'claude-code', version: '2.1.0' },
  schema_version: 'ATIF-v1.8',
  steps: [{ message: 'Orphan subagent work.', source: 'agent', step_id: 1 }],
  trajectory_id: MOCK_ORPHAN_SUBAGENT_ID,
};

export const MOCK_TRAJECTORY: AtifTrajectory = {
  agent: {
    model_name: 'claude-opus-4-8',
    name: 'claude-code',
    version: '2.1.0',
  },
  extra: {
    openthrottle: {
      driver: 'claude',
      errors: ['Usage limit reached during iteration 2.'],
      exitCode: 1,
      outcome: 'failed',
    },
  },
  final_metrics: {
    total_cached_tokens: 9_800,
    total_completion_tokens: 1_250,
    total_cost_usd: 0.4213,
    total_prompt_tokens: 12_400,
    total_steps: 6,
  },
  schema_version: 'ATIF-v1.8',
  steps: [
    { message: LONG_PROMPT, source: 'user', step_id: 1 },
    {
      message: 'I will read the route first.',
      observation: {
        results: [
          { content: LONG_OBSERVATION, source_call_id: 'call-read' },
          {
            content: 'bash: pnpm: command not found',
            extra: { is_error: true },
            source_call_id: 'call-bash',
          },
          { content: 'A stray result with no call.' },
        ],
      },
      reasoning_content: 'The loader lives in the route module.',
      source: 'agent',
      step_id: 2,
      tool_calls: [
        {
          arguments: { file_path: 'app/routes/plans.tsx' },
          function_name: 'Read',
          tool_call_id: 'call-read',
        },
        {
          arguments: { command: 'pnpm nx run openthrottle-developer:test' },
          function_name: 'Bash',
          tool_call_id: 'call-bash',
        },
      ],
    },
    {
      message: '',
      observation: {
        results: [
          {
            content: `Found 112 route modules.\nagentId: ${MOCK_SUBAGENT_ID}`,
            source_call_id: 'call-agent',
          },
          { content: 'patched 1 file', source_call_id: 'call-synth' },
        ],
      },
      source: 'agent',
      step_id: 3,
      tool_calls: [
        {
          arguments: { prompt: 'Find every route module.' },
          function_name: 'Agent',
          tool_call_id: 'call-agent',
        },
        {
          arguments: {},
          extra: { synthesized_from_result: true },
          function_name: 'apply_patch',
          tool_call_id: 'call-synth',
        },
      ],
    },
    {
      extra: {
        openthrottle: {
          kind: 'subagent_hand_back',
          subagent_trajectory_id: MOCK_SUBAGENT_ID,
        },
      },
      message: `Subagent hand-back (${MOCK_SUBAGENT_ID})`,
      observation: {
        results: [
          {
            content: 'Found 112 route modules.',
            subagent_trajectory_ref: { trajectory_id: MOCK_SUBAGENT_ID },
          },
        ],
      },
      source: 'system',
      step_id: 4,
    },
    {
      extra: { openthrottle: { kind: 'task_notification' } },
      message: `Background command "Validate touched projects" completed (exit code 0) (completed)`,
      source: 'system',
      step_id: 5,
    },
    { message: 'Done.', source: 'agent', step_id: 6 },
  ],
  subagent_trajectories: [MOCK_SUBAGENT, MOCK_ORPHAN_SUBAGENT],
};

/** A 600-step document, for the batched-rendering spec. */
export const MOCK_LONG_TRAJECTORY: AtifTrajectory = {
  agent: { name: 'codex', version: '0.50.0' },
  schema_version: 'ATIF-v1.8',
  steps: Array.from({ length: 600 }, (_, index): AtifStep => {
    return {
      message: `Step body ${index + 1}`,
      source: 'agent',
      step_id: index + 1,
    };
  }),
};

export const MOCK_TRAJECTORY_SUMMARY: AgentTrajectorySummaryFragment = {
  byteSize: 48_120,
  cachedTokens: 9_800,
  costUsd: 0.4213,
  createdAt: '2026-11-05T10:00:00.000Z',
  driver: 'claude',
  durationMs: 187_000,
  exitCode: 1,
  id: 'trajectory-1',
  incomplete: false,
  inputTokens: 12_400,
  model: 'claude-opus-4-8',
  outcome: 'failed',
  outputTokens: 1_250,
  planRunId: 'run-1',
  schemaVersion: 'ATIF-v1.8',
  source: 'spawned',
  taskId: 'task-1',
  toolCallCount: 4,
  truncated: true,
};

export const MOCK_UNPRICED_SESSION_SUMMARY: AgentTrajectorySummaryFragment = {
  ...MOCK_TRAJECTORY_SUMMARY,
  cachedTokens: null,
  costUsd: null,
  createdAt: '2026-11-06T09:00:00.000Z',
  driver: 'claude',
  id: 'trajectory-2',
  incomplete: true,
  source: 'session_upload',
  truncated: false,
};

export const MOCK_MY_LABEL: AgentTrajectoryLabelRowFragment = {
  createdAt: '2026-11-05T11:00:00.000Z',
  failureType: 'wrong-file',
  id: 'label-mine',
  note: 'Edited the route instead of the component.',
  rater: 'developer@openthrottle.ai',
  trajectoryId: 'trajectory-1',
  updatedAt: '2026-11-05T11:00:00.000Z',
  verdict: 'fail',
};

export const MOCK_OTHER_LABEL: AgentTrajectoryLabelRowFragment = {
  createdAt: '2026-11-05T12:00:00.000Z',
  failureType: null,
  id: 'label-other',
  note: 'Looks fine to me.',
  rater: 'reviewer@openthrottle.ai',
  trajectoryId: 'trajectory-1',
  updatedAt: '2026-11-05T12:00:00.000Z',
  verdict: 'pass',
};
