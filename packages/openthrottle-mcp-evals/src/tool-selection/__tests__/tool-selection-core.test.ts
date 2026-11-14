import { describe, expect, it } from 'vitest';

import { TOOL_SELECTION_CASES } from '../data/data.cases.ts';
import type { Selection } from '../eval-case.ts';
import {
  selectionFromTrajectory,
  selectionToTrajectory,
  usageOfTrajectory,
} from '../selection-trajectory.ts';
import {
  buildToolSelectionDataset,
  createToolSelectionGrader,
} from '../tool-selection-core.ts';

const selection: Extract<Selection, { kind: 'calls' }> = {
  calls: [{ input: { id: 'x' }, name: 'get_plan' }],
  kind: 'calls',
  text: 'looking',
  usage: {
    cacheReadInputTokens: 100,
    cacheWriteInputTokens: 10,
    inputTokens: 3,
    outputTokens: 7,
  },
};

describe('buildToolSelectionDataset', () => {
  it('keeps every case id and holds every case out in the test split', () => {
    const dataset = buildToolSelectionDataset(TOOL_SELECTION_CASES);

    expect(dataset.cases.map((c) => c.id)).toEqual(
      TOOL_SELECTION_CASES.map((c) => c.id),
    );
    expect(new Set(dataset.cases.map((c) => c.split))).toEqual(
      new Set(['test']),
    );
    expect(dataset.name).toBe('mcp_tool_selection');
  });

  it('round-trips through JSON, as a Postgres JSONB row would', () => {
    const dataset = buildToolSelectionDataset(TOOL_SELECTION_CASES);

    expect(JSON.parse(JSON.stringify(dataset))).toEqual(dataset);
  });
});

describe('selection trajectories', () => {
  it('records one agent step whose tool calls are the selection', () => {
    const trajectory = selectionToTrajectory(selection, 'm');

    expect(trajectory.steps).toHaveLength(1);
    expect(trajectory.steps[0]?.tool_calls).toEqual([
      {
        arguments: { id: 'x' },
        function_name: 'get_plan',
        tool_call_id: 'call-1',
      },
    ]);
    expect(selectionFromTrajectory(trajectory).calls).toEqual(selection.calls);
  });

  it('sums usage back out exactly and follows the ATIF prompt-includes-cache rule', () => {
    const trajectory = selectionToTrajectory(selection, 'm');

    expect(usageOfTrajectory(trajectory)).toEqual(selection.usage);
    expect(trajectory.final_metrics?.total_prompt_tokens).toBe(113);
  });

  it('omits tool_calls for a text-only turn', () => {
    const trajectory = selectionToTrajectory({ ...selection, calls: [] }, 'm');

    expect(trajectory.steps[0]?.tool_calls).toBeUndefined();
    expect(selectionFromTrajectory(trajectory).calls).toEqual([]);
  });
});

describe('createToolSelectionGrader', () => {
  const grader = createToolSelectionGrader({
    cases: TOOL_SELECTION_CASES,
    onGrade: () => undefined,
    otToolNames: new Set(['get_plan']),
  });
  const dataset = buildToolSelectionDataset(TOOL_SELECTION_CASES);

  it('is a versioned code grader named tool-selection', () => {
    expect(grader).toMatchObject({
      id: 'tool-selection',
      kind: 'code',
      version: '1',
    });
  });

  it('answers error, not fail, when the trial has no trajectory', async () => {
    const evalCase = dataset.cases[0];
    if (evalCase === undefined) {
      throw new Error('no cases');
    }

    const verdict = await grader.grade(
      {
        attempt: 1,
        caseId: evalCase.id,
        error: null,
        finalText: '',
        status: 'completed',
        trajectory: null,
        workspaceCwd: '',
      },
      evalCase,
    );

    expect(verdict.kind).toBe('error');
  });
});
