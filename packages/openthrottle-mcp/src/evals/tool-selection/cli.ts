/**
 * @description CLI for the on-demand `eval-tool-selection` Nx target. Lists the live tool surface and runs the
 * cases on the eval core (`@openthrottle/agentic-evals`) through either the Claude Messages API (`--driver api`,
 * the default) or one or more agent CLIs (`--driver claude,codex`) with the sandboxed MCP attached in place of
 * the real server. Writes each run to tmp/evals/tool-selection/ and compares it with the committed baseline for
 * the same driver and model in ./baselines/. Exit codes: 0 no regression, 1 regression, 2 usage error, 3 a CLI
 * reached an OpenThrottle server other than the sandbox. Never run in CI — every run spends tokens or
 * subscription usage. See ./README.md.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import type { EvalAuthMode, EvalRunConfig } from '@openthrottle/agentic-evals';
import { runDriverIteration } from '@openthrottle/agentic-evals';

import { TOOLSET_NAMES } from '../../config/toolsets.ts';
import type { ToolSurface } from '../../model-facing-text/surface.ts';
import { listToolSurface } from '../../model-facing-text/surface.ts';
import { SANDBOX_CALL_LOG_ENV } from '../sandbox/bin-sandbox.ts';
import { createAnthropicToolSelector } from './anthropic-tool-selector.ts';
import type { BaselineComparison, RunResult } from './compareBaseline.ts';
import { compareBaseline, passRate } from './compareBaseline.ts';
import { TOOL_SELECTION_CASES } from './data/data.cases.ts';
import {
  CLI_DRIVER_BINARIES,
  DEFAULT_CLI_TIMEOUT_MS,
  UNSUPPORTED_CLI_DRIVERS,
} from './data/data.cli-drivers.ts';
import { HARNESS_TOOLS } from './data/data.harness-tools.ts';
import type { ToolSelectionCase, TrialGrade } from './eval-case.ts';
import { runCliEvals } from './runCliEvals.ts';
import type { ToolSelectionRun } from './runEvals.ts';
import { runEvals } from './runEvals.ts';
import type { CliDriverId, SandboxLaunch } from './sandbox-attachment.ts';
import { isCliDriverId } from './sandbox-attachment.ts';

const SANDBOX_ENTRY = fileURLToPath(
  new URL('../sandbox/bin-sandbox.ts', import.meta.url),
);
const BASELINE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'baselines');
const RESULTS_DIR = resolve('tmp/evals/tool-selection');

const fileStem = (model: string): string => {
  return model.replace(/[^a-z0-9.-]/gi, '-');
};

const isRunResult = (value: unknown): value is RunResult => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'model' in value &&
    typeof value.model === 'string' &&
    'cases' in value &&
    Array.isArray(value.cases)
  );
};

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

const percent = (rate: number): string => {
  return `${Math.round(rate * 100)}%`;
};

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

const printStats = (report: ToolSelectionRun['report']): void => {
  const { numbers } = report;
  const { passRate: rate, passRateCi: ci } = numbers;
  if (rate === null || ci === null) {
    process.stdout.write('  core stats: no gradable trials\n');

    return;
  }
  const floor = numbers.detectionFloor;
  process.stdout.write(
    `  overall pass rate ${percent(rate)} (${numbers.trialsPassed}/${numbers.trialsCounted}), bootstrap 95% CI ${percent(ci.lower)}–${percent(ci.upper)}` +
      `${floor === null ? '' : `, detection floor ±${percent(floor)} over ${numbers.casesCounted} cases`}\n`,
  );
  if (numbers.trialsExcluded > 0) {
    process.stdout.write(
      `  ${numbers.trialsExcluded} errored trial(s) are excluded from the core stats but count as failures against the baseline\n`,
    );
  }
};

const AUTH_MODES = ['api_key', 'subscription'] as const;

const CLI_EFFORTS = [
  'extraHigh',
  'high',
  'low',
  'max',
  'medium',
  'ultra',
] as const satisfies readonly NonNullable<EvalRunConfig['effort']>[];

const isAuthMode = (value: string): value is EvalAuthMode => {
  return AUTH_MODES.some((mode) => {
    return mode === value;
  });
};

const cliEffortOf = (
  value: string | undefined,
): EvalRunConfig['effort'] | null => {
  if (value === undefined) {
    return undefined;
  }

  return (
    CLI_EFFORTS.find((effort) => {
      return effort === value;
    }) ?? null
  );
};

interface ParsedValues {
  readonly 'auth-mode': string | undefined;
  readonly case: string | undefined;
  readonly concurrency: string;
  readonly driver: string;
  readonly effort: string | undefined;
  readonly model: string | undefined;
  readonly 'timeout-ms': string | undefined;
  readonly tolerance: string;
  readonly trials: string;
  readonly 'write-baseline': boolean;
}

/**
 * @description Writes the run, then writes or compares the baseline. Returns the exit code.
 */
const finishRun = (
  result: RunResult,
  report: ToolSelectionRun['report'],
  cases: readonly ToolSelectionCase[],
  values: ParsedValues,
): number => {
  printRun(result, cases);
  printStats(report);
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
};

const runApi = async (
  cases: readonly ToolSelectionCase[],
  values: ParsedValues,
): Promise<number> => {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (apiKey === undefined || apiKey === '') {
    process.stderr.write(
      'ANTHROPIC_API_KEY is not set; the eval calls the Claude Messages API.\n',
    );

    return 2;
  }
  const effort = values.effort ?? 'medium';
  const surface = await listToolSurface(new Set(TOOLSET_NAMES));
  const selector = createAnthropicToolSelector({
    apiKey,
    baseUrl: process.env['ANTHROPIC_BASE_URL'] ?? 'https://api.anthropic.com',
    client: undefined,
    effort,
    harnessTools: HARNESS_TOOLS,
    maxRetries: 3,
    model: values.model ?? 'claude-opus-5-5',
    surface,
  });
  const { report, result } = await runEvals({
    cases,
    concurrency: Number(values.concurrency),
    effort,
    onTrial: printTrial,
    selector,
    surface,
    trials: Number(values.trials),
  });

  return finishRun(result, report, cases, values);
};

const printTrial = (id: string, grade: TrialGrade): void => {
  process.stdout.write(
    `${grade.pass ? '.' : 'F'}${grade.pass ? '' : `(${id})`}`,
  );
};

/**
 * @description How the sandbox is launched as a stdio child of the CLI: this Node, tsx's CLI and the sandbox entry,
 * all absolute, because the CLI spawns it from an empty temp cwd.
 */
const sandboxLaunchFor = (callLogPath: string): SandboxLaunch => {
  const require = createRequire(import.meta.url);

  return {
    args: [require.resolve('tsx/cli'), SANDBOX_ENTRY],
    command: process.execPath,
    env: { [SANDBOX_CALL_LOG_ENV]: callLogPath },
  };
};

const runCli = async (
  driverId: CliDriverId,
  cases: readonly ToolSelectionCase[],
  values: ParsedValues,
  surface: ToolSurface,
): Promise<number> => {
  const authMode = values['auth-mode'] ?? 'subscription';
  const effort = cliEffortOf(values.effort);
  if (!isAuthMode(authMode) || effort === null) {
    process.stderr.write(
      `--auth-mode takes ${AUTH_MODES.join('|')}; --effort takes ${CLI_EFFORTS.join('|')} for a CLI driver.\n`,
    );

    return 2;
  }
  const { binEnv, binary } = CLI_DRIVER_BINARIES[driverId];
  const realBin = process.env[binEnv]?.trim() || binary;
  process.stdout.write(
    `\n== ${driverId} (${realBin}), auth ${authMode}, sandboxed MCP ==\n`,
  );
  const { report, result } = await runCliEvals({
    authMode,
    cases,
    driverId,
    effort,
    launchFor: sandboxLaunchFor,
    model: values.model,
    onTrial: printTrial,
    realBin,
    runIteration: runDriverIteration,
    surface,
    timeoutMs: Number(values['timeout-ms'] ?? DEFAULT_CLI_TIMEOUT_MS),
    trials: Number(values.trials),
  });
  if (result.leak !== null) {
    process.stderr.write(
      `\nLEAK: ${result.leak}. An OpenThrottle call reached a server other than the sandbox; the run was stopped. Check this CLI's MCP configuration before running it again.\n`,
    );

    return 3;
  }

  return finishRun(result, report, cases, values);
};

const parseDrivers = (
  raw: string,
): { readonly drivers: readonly string[]; readonly error: string | null } => {
  const drivers = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');
  if (drivers.includes('api') && drivers.length > 1) {
    return {
      drivers,
      error: '--driver api cannot be combined with a CLI driver.',
    };
  }
  const refused = drivers.flatMap((driver) => {
    if (driver === 'api' || isCliDriverId(driver)) {
      return [];
    }
    const reason = UNSUPPORTED_CLI_DRIVERS[driver] ?? 'is not a known driver';

    return [
      `--driver ${driver} is not supported against the sandboxed MCP: it ${reason}.`,
    ];
  });

  return { drivers, error: refused.length > 0 ? refused.join('\n') : null };
};

/**
 * @description Entry point; returns the process exit code.
 * @public
 */
export async function main(argv: readonly string[]): Promise<number> {
  const { values: raw } = parseArgs({
    args: [...argv],
    options: {
      'auth-mode': { type: 'string' },
      case: { type: 'string' },
      concurrency: { default: '4', type: 'string' },
      driver: { default: 'api', type: 'string' },
      effort: { type: 'string' },
      model: { type: 'string' },
      'timeout-ms': { type: 'string' },
      tolerance: { default: '0', type: 'string' },
      trials: { default: '1', type: 'string' },
      'write-baseline': { default: false, type: 'boolean' },
    },
  });
  const values: ParsedValues = {
    'auth-mode': raw['auth-mode'],
    case: raw.case,
    concurrency: raw.concurrency,
    driver: raw.driver,
    effort: raw.effort,
    model: raw.model,
    'timeout-ms': raw['timeout-ms'],
    tolerance: raw.tolerance,
    trials: raw.trials,
    'write-baseline': raw['write-baseline'],
  };
  const { drivers, error } = parseDrivers(values.driver);
  if (error !== null || drivers.length === 0) {
    process.stderr.write(`${error ?? '--driver is empty.'}\n`);

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
  if (drivers[0] === 'api') {
    return runApi(cases, values);
  }

  const surface = await listToolSurface(new Set(TOOLSET_NAMES));
  const cliDrivers = drivers.filter(isCliDriverId);
  // One run per driver, strictly sequential: a CLI trial spends subscription usage, and parallel runs would
  // share one account. Deliberate sequencing — the one sanctioned await-in-loop case.
  const codes: number[] = [];
  for (const driverId of cliDrivers) {
    // eslint-disable-next-line no-await-in-loop -- one CLI at a time on one subscription
    codes.push(await runCli(driverId, cases, values, surface));
  }

  return Math.max(...codes);
}

if (process.argv[1]?.endsWith('tool-selection/cli.ts')) {
  process.exitCode = await main(process.argv.slice(2));
}
