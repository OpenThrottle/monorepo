import { describe, expect, test } from 'vitest';

import {
  MOCK_ORPHAN_SUBAGENT_ID,
  MOCK_SUBAGENT_ID,
  MOCK_TRAJECTORY,
} from '~/routing/evals/data/mock.trajectory';
import type { AtifTrajectory } from '~/routing/evals/types';

import {
  buildTrajectoryTimeline,
  correlateSubagents,
  readTrajectoryErrors,
} from '../timeline';

describe('buildTrajectoryTimeline', () => {
  test('keeps every step in document order', () => {
    const { steps } = buildTrajectoryTimeline(MOCK_TRAJECTORY);

    expect(
      steps.map((view) => {
        return view.step.step_id;
      }),
    ).toEqual([1, 2, 3, 4]);
  });

  test('pairs each call with the result whose source_call_id matches', () => {
    const step = buildTrajectoryTimeline(MOCK_TRAJECTORY).steps[1];
    const [read, bash] = step?.toolCalls ?? [];

    expect(read?.call.function_name).toBe('Read');
    expect(read?.results).toHaveLength(1);
    expect(read?.isError).toBe(false);
    expect(bash?.results[0]?.content).toContain('command not found');
    expect(bash?.isError).toBe(true);
  });

  test('keeps a result that names no call as unmatched', () => {
    const step = buildTrajectoryTimeline(MOCK_TRAJECTORY).steps[1];

    expect(step?.unmatchedResults).toEqual([
      { content: 'A stray result with no call.' },
    ]);
  });

  test('flags a call rebuilt from its result', () => {
    const step = buildTrajectoryTimeline(MOCK_TRAJECTORY).steps[2];
    const synthesized = step?.toolCalls.find((view) => {
      return view.call.function_name === 'apply_patch';
    });

    expect(synthesized?.isSynthesized).toBe(true);
  });

  test('places a subagent under the call whose result mentions it', () => {
    const step = buildTrajectoryTimeline(MOCK_TRAJECTORY).steps[2];
    const agentCall = step?.toolCalls[0];

    expect(
      agentCall?.subagents.map((subagent) => subagent.trajectory_id),
    ).toEqual([MOCK_SUBAGENT_ID]);
  });
});

describe('correlateSubagents', () => {
  test('returns a subagent no result mentions as unplaced', () => {
    const { byCallId, unplaced } = correlateSubagents(MOCK_TRAJECTORY);

    expect(byCallId.get('call-agent')).toHaveLength(1);
    expect(unplaced.map((subagent) => subagent.trajectory_id)).toEqual([
      MOCK_ORPHAN_SUBAGENT_ID,
    ]);
  });

  test('places a subagent by its ATIF reference when no text mentions it', () => {
    const trajectory: AtifTrajectory = {
      ...MOCK_TRAJECTORY,
      steps: [
        {
          message: '',
          observation: {
            results: [
              {
                content: 'Done.',
                source_call_id: 'call-spawn',
                subagent_trajectory_ref: { trajectory_id: 'agent-ref' },
              },
            ],
          },
          source: 'agent',
          step_id: 1,
          tool_calls: [
            {
              arguments: {},
              function_name: 'Agent',
              tool_call_id: 'call-spawn',
            },
          ],
        },
      ],
      subagent_trajectories: [
        {
          agent: { name: 'claude', version: '1' },
          schema_version: 'ATIF-v1.8',
          steps: [],
          trajectory_id: 'agent-ref',
        },
      ],
    };
    const { byCallId, unplaced } = correlateSubagents(trajectory);

    expect(byCallId.get('call-spawn')).toHaveLength(1);
    expect(unplaced).toEqual([]);
  });

  test('treats a subagent without an id as unplaced', () => {
    const trajectory: AtifTrajectory = {
      ...MOCK_TRAJECTORY,
      subagent_trajectories: [
        {
          agent: { name: 'x', version: '1' },
          schema_version: 'ATIF-v1.8',
          steps: [],
        },
      ],
    };

    expect(correlateSubagents(trajectory).unplaced).toHaveLength(1);
  });
});

describe('readTrajectoryErrors', () => {
  test('reads extra.openthrottle.errors', () => {
    expect(readTrajectoryErrors(MOCK_TRAJECTORY)).toEqual([
      'Usage limit reached during iteration 2.',
    ]);
  });

  test('is empty when the field is absent or not strings', () => {
    expect(
      readTrajectoryErrors({ ...MOCK_TRAJECTORY, extra: undefined }),
    ).toEqual([]);
    expect(
      readTrajectoryErrors({
        ...MOCK_TRAJECTORY,
        extra: { openthrottle: { errors: [1, '', 'real'] } },
      }),
    ).toEqual(['real']);
  });
});
