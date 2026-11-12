import { describe, expect, it } from 'vitest';

import type { ToolSurface } from '../../model-facing-text/list-tool-surface.ts';
import type {
  Selection,
  ToolSelectionCase,
  ToolSelector,
} from './eval-case.ts';
import { runEvals, surfaceSha256 } from './run-evals.ts';

const surface: ToolSurface = {
  instructions: '',
  tools: [{ inputSchema: { type: 'object' }, name: 'get_plan' }],
};

const usage = {
  cacheReadInputTokens: 1,
  cacheWriteInputTokens: 0,
  inputTokens: 2,
  outputTokens: 3,
};

const cases: readonly ToolSelectionCase[] = [
  {
    area: 'plan-crud',
    expect: { args: {}, kind: 'call', tools: ['get_plan'] },
    forbid: [],
    id: 'pick',
    origin: { kind: 'seed' },
    prompt: 'show plan',
  },
  {
    area: 'control',
    expect: { kind: 'no-call' },
    forbid: [],
    id: 'control',
    origin: { kind: 'seed' },
    prompt: 'rename var',
  },
];

/**
 * @description A scripted selector: "show plan" alternates hit/miss across trials; anything else gets a
 * text-only answer. Tracks peak concurrency.
 */
const scriptedSelector = (): ToolSelector & { readonly peak: () => number } => {
  let inFlight = 0;
  let peak = 0;
  let planCalls = 0;

  return {
    model: 'fake',
    peak: () => peak,
    select: async (prompt: string): Promise<Selection> => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      // A macrotask yield lets other in-flight selections overlap this one.
      await new Promise((resolve) => setTimeout(resolve, 0));
      inFlight -= 1;
      if (prompt === 'show plan') {
        planCalls += 1;
        const name = planCalls % 2 === 1 ? 'get_plan' : 'list_sources';

        return { calls: [{ input: {}, name }], kind: 'calls', text: '', usage };
      }

      return { calls: [], kind: 'calls', text: 'sure', usage };
    },
  };
};

describe('runEvals', () => {
  it('grades every trial, aggregates per case, and sums usage', async () => {
    const selector = scriptedSelector();
    const seen: string[] = [];
    const { report, result } = await runEvals({
      cases,
      concurrency: 2,
      effort: 'low',
      onTrial: (id) => seen.push(id),
      selector,
      surface,
      trials: 2,
    });

    expect(result.model).toBe('fake');
    expect(result.cases).toEqual([
      {
        failures: ['expected get_plan, got list_sources'],
        id: 'pick',
        passes: 1,
        trials: 2,
      },
      { failures: [], id: 'control', passes: 2, trials: 2 },
    ]);
    expect(result.usage).toEqual({
      cacheReadInputTokens: 4,
      cacheWriteInputTokens: 0,
      inputTokens: 8,
      outputTokens: 12,
    });
    expect(seen).toHaveLength(4);
    expect(selector.peak()).toBeLessThanOrEqual(2);
    expect(result.surfaceSha256).toBe(surfaceSha256(surface));
    expect(report.numbers).toMatchObject({
      passRate: 0.75,
      trialsCounted: 4,
      trialsExcluded: 0,
      trialsPassed: 3,
    });
    expect(report.numbers.passRateCi).not.toBeNull();
    expect(report.numbers.detectionFloor).not.toBeNull();
  });

  it('keeps an errored trial in the baseline result but excludes it from the core report', async () => {
    const { report, result } = await runEvals({
      cases: cases.slice(0, 1),
      concurrency: 1,
      effort: 'low',
      onTrial: () => undefined,
      selector: {
        model: 'fake',
        select: async () => ({ kind: 'error', message: 'HTTP 529' }),
      },
      surface,
      trials: 2,
    });

    expect(result.cases).toEqual([
      {
        failures: ['error: HTTP 529', 'error: HTTP 529'],
        id: 'pick',
        passes: 0,
        trials: 2,
      },
    ]);
    expect(report.numbers).toMatchObject({
      passRate: null,
      trialsExcluded: 2,
    });
  });
});
