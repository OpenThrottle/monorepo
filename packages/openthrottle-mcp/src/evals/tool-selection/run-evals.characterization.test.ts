/**
 * @description Parity proof for the eval-core port. These literals were recorded against the original
 * hand-rolled run loop with a scripted selector over real cases from `data.cases.ts`, and must keep passing
 * through whatever implements `runEvals` — the aggregated per-case results are what committed baselines and
 * `compareBaseline` read, so any drift here is a baseline-compatibility break.
 */

import { describe, expect, it } from 'vitest';

import type { ToolSurface } from '../../model-facing-text/listToolSurface.ts';
import { TOOL_SELECTION_CASES } from './data/data.cases.ts';
import type {
  SelectedCall,
  Selection,
  SelectionUsage,
  ToolSelector,
} from './eval-case.ts';
import { runEvals } from './run-evals.ts';

const PLAN_ID = '3f2b6c1e-8a4d-4e7b-9c21-5d6e7f8a9b0c';
const TASK_ID = '7a1c2d3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e';

const OT_TOOLS = [
  'delete_plan',
  'delete_task',
  'get_plan',
  'list_plans_by_status',
  'update_plan',
  'update_task',
];

const surface: ToolSurface = {
  instructions: 'instructions',
  tools: OT_TOOLS.map((name) => ({ inputSchema: { type: 'object' }, name })),
};

const SURFACE_SHA256 = `595b44252a0e1a235d9cba01b445be1f7f06b9a1c9dd5b6805bb0b4926fd347c`;

const usage = (seed: number): SelectionUsage => {
  return {
    cacheReadInputTokens: seed * 100,
    cacheWriteInputTokens: seed * 10,
    inputTokens: seed,
    outputTokens: seed * 2,
  };
};

const calls = (seed: number, ...picked: SelectedCall[]): Selection => {
  return {
    calls: picked,
    kind: 'calls',
    text: `text ${seed}`,
    usage: usage(seed),
  };
};

const call = (name: string, input: unknown): SelectedCall => {
  return { input, name };
};

const caseById = (id: string) => {
  const found = TOOL_SELECTION_CASES.find((c) => c.id === id);
  if (found === undefined) {
    throw new Error(`no case ${id}`);
  }

  return found;
};

const CASE_ORDER = [
  'plan-get',
  'plan-update-status',
  'task-start',
  'control-rename-variable',
  'control-git-log',
  'plan-delete',
  'plan-list-in-progress',
];

/** Selections per case id, consumed in trial order (three trials per case). */
const SCRIPT: Readonly<Record<string, readonly Selection[]>> = {
  // a control failing
  'control-git-log': [
    calls(5, call('list_plans_by_status', { statuses: ['IN_PROGRESS'] })),
    calls(5, call('bash', { command: 'git log -5' })),
    calls(5, call('bash', { command: 'git log -5' })),
  ],
  // a no-call control passing (harness tools are fine)
  'control-rename-variable': [
    calls(
      4,
      call('bash', { command: 'sed -i s/cnt/count/ src/utils/math.ts' }),
    ),
    calls(4),
    calls(4, call('edit_file', {})),
  ],
  // an error / refusal
  'plan-delete': [
    { kind: 'error', message: 'refusal: declined to answer' },
    { kind: 'error', message: 'HTTP 529: overloaded' },
    calls(6, call('delete_plan', { id: PLAN_ID })),
  ],
  // a passing call, every trial
  'plan-get': [
    calls(1, call('get_plan', { id: PLAN_ID })),
    calls(1, call('get_plan', { id: PLAN_ID })),
    calls(1, call('get_plan', { id: PLAN_ID })),
  ],
  // a multi-trial case with mixed outcomes: pass, args mismatch, error
  'plan-list-in-progress': [
    calls(7, call('list_plans_by_status', { statuses: ['IN_PROGRESS'] })),
    calls(7, call('list_plans_by_status', { statuses: ['COMPLETED'] })),
    { kind: 'error', message: 'HTTP 500: upstream' },
  ],
  // a wrong tool
  'plan-update-status': [
    calls(2, call('get_plan', { id: PLAN_ID })),
    calls(2, call('get_plan', { id: PLAN_ID })),
    calls(2, call('update_plan', { id: PLAN_ID, status: 'COMPLETED' })),
  ],
  // a forbidden tool
  'task-start': [
    calls(3, call('delete_task', { id: TASK_ID })),
    calls(3, call('update_task', { id: TASK_ID, status: 'IN_PROGRESS' })),
    calls(3, call('update_task', { id: TASK_ID, status: 'IN_PROGRESS' })),
  ],
};

const scriptedSelector = (): ToolSelector => {
  const used = new Map<string, number>();
  const promptToId = new Map(
    Object.keys(SCRIPT).map((id) => [caseById(id).prompt, id]),
  );

  return {
    model: 'scripted-model',
    select: async (prompt: string): Promise<Selection> => {
      const id = promptToId.get(prompt) ?? '';
      const index = used.get(id) ?? 0;
      used.set(id, index + 1);
      const selection = SCRIPT[id]?.[index];
      if (selection === undefined) {
        throw new Error(`unscripted request for ${id} #${index}`);
      }

      return selection;
    },
  };
};

describe('runEvals characterization (parity with the pre-port run loop)', () => {
  it('aggregates the scripted selections into the exact baseline shape', async () => {
    const { result } = await runEvals({
      cases: CASE_ORDER.map(caseById),
      concurrency: 1,
      effort: 'medium',
      onTrial: () => undefined,
      selector: scriptedSelector(),
      surface,
      trials: 3,
    });

    expect(result).toEqual({
      cases: [
        { failures: [], id: 'plan-get', passes: 3, trials: 3 },
        {
          failures: [
            'expected update_plan, got get_plan',
            'expected update_plan, got get_plan',
          ],
          id: 'plan-update-status',
          passes: 1,
          trials: 3,
        },
        {
          failures: ['called forbidden delete_task'],
          id: 'task-start',
          passes: 2,
          trials: 3,
        },
        { failures: [], id: 'control-rename-variable', passes: 3, trials: 3 },
        {
          failures: ['expected no OT call, got list_plans_by_status'],
          id: 'control-git-log',
          passes: 2,
          trials: 3,
        },
        {
          failures: [
            'error: refusal: declined to answer',
            'error: HTTP 529: overloaded',
          ],
          id: 'plan-delete',
          passes: 1,
          trials: 3,
        },
        {
          failures: [
            'list_plans_by_status args did not match: statuses',
            'error: HTTP 500: upstream',
          ],
          id: 'plan-list-in-progress',
          passes: 1,
          trials: 3,
        },
      ],
      effort: 'medium',
      model: 'scripted-model',
      surfaceSha256: SURFACE_SHA256,
      usage: {
        cacheReadInputTokens: 6500,
        cacheWriteInputTokens: 650,
        inputTokens: 65,
        outputTokens: 130,
      },
    });
  });
});
