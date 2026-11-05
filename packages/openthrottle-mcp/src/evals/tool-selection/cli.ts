/**
 * @description CLI for the on-demand `eval-tool-selection` Nx target. Lists the live tool surface, runs the
 * cases against the Claude Messages API, writes the run to tmp/evals/tool-selection/, and compares it with the
 * committed same-model baseline in ./baselines/. Exit codes: 0 no regression, 1 regression, 2 usage error.
 * Never run in CI — every run spends API tokens. See ./README.md.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { listToolSurface } from '../../model-facing-text/list-tool-surface.ts';
import { createAnthropicToolSelector } from './anthropic-tool-selector.ts';
import type { BaselineComparison, RunResult } from './compare-baseline.ts';
import { compareBaseline, passRate } from './compare-baseline.ts';
import { TOOL_SELECTION_CASES } from './data/data.cases.ts';
import { HARNESS_TOOLS } from './data/data.harness-tools.ts';
import type { ToolSelectionCase } from './eval-case.ts';
import { runEvals } from './run-evals.ts';

const BASELINE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'baselines');
const RESULTS_DIR = resolve('tmp/evals/tool-selection');

const fileStem = (model: string): string => model.replace(/[^a-z0-9.-]/gi, '-');

const isRunResult = (value: unknown): value is RunResult =>
  typeof value === 'object' &&
  value !== null &&
  'model' in value &&
  typeof value.model === 'string' &&
  'cases' in value &&
  Array.isArray(value.cases);

const selectCases = (
  filter: string | undefined,
): readonly ToolSelectionCase[] => {
  if (filter === undefined) {
    return TOOL_SELECTION_CASES;
  }
  const wanted = new Set(filter.split(',').map((part) => part.trim()));

  return TOOL_SELECTION_CASES.filter(
    (c) => wanted.has(c.id) || wanted.has(c.area),
  );
};

const readBaseline = (
  path: string,
  ids: ReadonlySet<string>,
): RunResult | undefined => {
  if (!existsSync(path)) {
    return undefined;
  }
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isRunResult(parsed)) {
    throw new Error(`${path} is not a tool-selection run result`);
  }

  return { ...parsed, cases: parsed.cases.filter((c) => ids.has(c.id)) };
};

const percent = (rate: number): string => `${Math.round(rate * 100)}%`;

const printComparison = (comparison: BaselineComparison): void => {
  if (comparison.kind === 'model-mismatch') {
    process.stdout.write(
      `\nBaseline is for ${comparison.baselineModel}, run is ${comparison.currentModel}: not compared.\n`,
    );

    return;
  }
  const line = (label: string, items: readonly string[]): void => {
    if (items.length > 0) {
      process.stdout.write(`  ${label}: ${items.join(', ')}\n`);
    }
  };
  process.stdout.write('\nVs baseline:\n');
  line(
    'REGRESSED',
    comparison.regressions.map(
      (d) => `${d.id} ${percent(d.baselineRate)}→${percent(d.currentRate)}`,
    ),
  );
  line(
    'improved',
    comparison.improvements.map(
      (d) => `${d.id} ${percent(d.baselineRate)}→${percent(d.currentRate)}`,
    ),
  );
  line('new (no baseline)', comparison.added);
  line('missing from run', comparison.removed);
  if (comparison.regressions.length === 0) {
    process.stdout.write('  no regressions\n');
  }
};

const printRun = (
  result: RunResult,
  cases: readonly ToolSelectionCase[],
): void => {
  const areas = [...new Set(cases.map((c) => c.area))].sort();
  process.stdout.write(
    `\n${result.model} (effort ${result.effort}), surface ${result.surfaceSha256.slice(0, 12)}\n`,
  );
  areas.forEach((area) => {
    const ids = new Set(cases.filter((c) => c.area === area).map((c) => c.id));
    const mine = result.cases.filter((c) => ids.has(c.id));
    const passes = mine.reduce((sum, c) => sum + c.passes, 0);
    const trials = mine.reduce((sum, c) => sum + c.trials, 0);
    process.stdout.write(`  ${area.padEnd(10)} ${passes}/${trials}\n`);
  });
  result.cases
    .filter((c) => passRate(c) < 1)
    .forEach((c) => {
      process.stdout.write(
        `  FAIL ${c.id} (${c.passes}/${c.trials}): ${[...new Set(c.failures)].join(' ; ')}\n`,
      );
    });
  const { usage } = result;
  process.stdout.write(
    `  tokens: input ${usage.inputTokens}, cache write ${usage.cacheWriteInputTokens}, cache read ${usage.cacheReadInputTokens}, output ${usage.outputTokens}\n`,
  );
};

/**
 * @description Entry point; returns the process exit code.
 * @public
 */
export async function main(argv: readonly string[]): Promise<number> {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      case: { type: 'string' },
      concurrency: { default: '4', type: 'string' },
      effort: { default: 'medium', type: 'string' },
      model: { default: 'claude-opus-5-5', type: 'string' },
      tolerance: { default: '0', type: 'string' },
      trials: { default: '1', type: 'string' },
      'write-baseline': { default: false, type: 'boolean' },
    },
  });
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (apiKey === undefined || apiKey === '') {
    process.stderr.write(
      'ANTHROPIC_API_KEY is not set; the eval calls the Claude Messages API.\n',
    );

    return 2;
  }
  if (values['write-baseline'] && values.case !== undefined) {
    process.stderr.write(
      '--write-baseline needs the full suite; drop --case.\n',
    );

    return 2;
  }
  const cases = selectCases(values.case);
  if (cases.length === 0) {
    process.stderr.write(
      `--case ${values.case ?? ''} matched no case id or area.\n`,
    );

    return 2;
  }

  const surface = await listToolSurface();
  const selector = createAnthropicToolSelector({
    apiKey,
    baseUrl: process.env['ANTHROPIC_BASE_URL'] ?? 'https://api.anthropic.com',
    effort: values.effort,
    fetchImpl: fetch,
    harnessTools: HARNESS_TOOLS,
    maxRetries: 3,
    model: values.model,
    surface,
  });
  const result = await runEvals({
    cases,
    concurrency: Number(values.concurrency),
    effort: values.effort,
    onTrial: (id, grade) => {
      process.stdout.write(
        `${grade.pass ? '.' : 'F'}${grade.pass ? '' : `(${id})`}`,
      );
    },
    selector,
    surface,
    trials: Number(values.trials),
  });

  printRun(result, cases);
  mkdirSync(RESULTS_DIR, { recursive: true });
  const resultPath = join(RESULTS_DIR, `${fileStem(result.model)}.json`);
  writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`  wrote ${resultPath}\n`);

  const baselinePath = join(BASELINE_DIR, `${fileStem(result.model)}.json`);
  if (values['write-baseline']) {
    mkdirSync(BASELINE_DIR, { recursive: true });
    writeFileSync(baselinePath, `${JSON.stringify(result, null, 2)}\n`);
    process.stdout.write(`  wrote baseline ${baselinePath} — commit it\n`);

    return 0;
  }

  const baseline = readBaseline(baselinePath, new Set(cases.map((c) => c.id)));
  if (baseline === undefined) {
    process.stdout.write(
      `\nNo baseline for ${result.model}; record one with --write-baseline.\n`,
    );

    return 0;
  }
  const comparison = compareBaseline(
    baseline,
    result,
    Number(values.tolerance),
  );
  printComparison(comparison);

  return comparison.kind === 'compared' && comparison.regressions.length > 0
    ? 1
    : 0;
}

if (process.argv[1]?.endsWith('tool-selection/cli.ts')) {
  process.exitCode = await main(process.argv.slice(2));
}
