/**
 * @description Runs the tool-selection cases through one agent CLI against the sandboxed MCP: sequential
 * (concurrency 1, one subscription), each trial in an empty temp workspace, graded by the same rules as the
 * Messages API run and folded into the same baseline shape. The recorded model is `<driver>/<model>`, so a CLI
 * baseline is keyed by driver AND model and is never compared with another driver's.
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type {
  EvalAuthMode,
  EvalRunConfig,
  EvalWorkspaceFactory,
  RunEvalIteration,
} from '@openthrottle/agentic-evals';
import { runEval } from '@openthrottle/agentic-evals';

import type { ToolSurface } from '../../model-facing-text/surface.ts';
import {
  createCliRunState,
  createCliToolSelectionGrader,
  createCliToolSelectionIteration,
} from './cli-tool-selection-core.ts';
import type { RunResult } from './compareBaseline.ts';
import { CLI_DEFAULT_MODEL_LABEL } from './data/data.cli-drivers.ts';
import type { ToolSelectionCase, TrialGrade } from './eval-case.ts';
import type { ToolSelectionRun } from './runEvals.ts';
import { toToolSelectionRun } from './runEvals.ts';
import type { CliDriverId, SandboxLaunch } from './sandbox-attachment.ts';
import { buildToolSelectionDataset } from './tool-selection-core.ts';

/**
 * @description Options for {@link runCliEvals}.
 */
export interface RunCliEvalsOptions {
  readonly authMode: EvalAuthMode;
  readonly cases: readonly ToolSelectionCase[];
  readonly driverId: CliDriverId;
  readonly effort: EvalRunConfig['effort'];
  readonly launchFor: (callLogPath: string) => SandboxLaunch;
  readonly model: string | undefined;
  readonly onTrial: (caseId: string, grade: TrialGrade) => void;
  readonly realBin: string;
  readonly runIteration: RunEvalIteration;
  readonly surface: ToolSurface;
  readonly timeoutMs: number;
  readonly trials: number;
}

/**
 * @description A CLI run's baseline-shaped result, plus how it was billed, which CLI ran it, and the leak that
 * stopped it (`null` when none did).
 */
export interface CliRunResult extends RunResult {
  readonly authMode: EvalAuthMode;
  readonly driver: CliDriverId;
  readonly leak: string | null;
}

/**
 * @description A finished CLI run: the result and the core report.
 */
export interface CliToolSelectionRun {
  readonly report: ToolSelectionRun['report'];
  readonly result: CliRunResult;
}

/**
 * @description One empty temp directory per trial, so no repo `.mcp.json` or trusted project config is in reach.
 */
const emptyTempWorkspaceFactory: EvalWorkspaceFactory = {
  create: async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'ot-eval-cli-'));

    return {
      cwd,
      dispose: async () => {
        await rm(cwd, { force: true, recursive: true });
      },
    };
  },
};

/**
 * @description The model a CLI run records: `<driver>/<model>`, with `cli-default` when none was requested.
 * @public
 */
export function cliModelLabel(
  driverId: CliDriverId,
  model: string | undefined,
): string {
  return `${driverId}/${model ?? CLI_DEFAULT_MODEL_LABEL}`;
}

/**
 * @description Runs every case through `driverId` with the sandbox attached.
 * @public
 */
export async function runCliEvals(
  options: RunCliEvalsOptions,
): Promise<CliToolSelectionRun> {
  const { cases, driverId, surface } = options;
  const state = createCliRunState();
  const config: EvalRunConfig = {
    attempts: options.trials,
    authMode: options.authMode,
    budget: { maxTokens: null },
    concurrency: 1,
    driverId,
    effort: options.effort,
    model: options.model,
  };
  const run = await runEval({
    config,
    dataset: buildToolSelectionDataset(cases),
    graders: [
      createCliToolSelectionGrader({
        cases,
        onGrade: options.onTrial,
        otToolNames: new Set(surface.tools.map((tool) => tool.name)),
        state,
      }),
    ],
    runIteration: createCliToolSelectionIteration({
      driverId,
      launchFor: options.launchFor,
      realBin: options.realBin,
      runIteration: options.runIteration,
      state,
    }),
    timeoutMs: options.timeoutMs,
    workspace: emptyTempWorkspaceFactory,
  });
  const { report, result } = toToolSelectionRun({
    cases,
    effort: options.effort ?? CLI_DEFAULT_MODEL_LABEL,
    model: cliModelLabel(driverId, options.model),
    run,
    surface,
    trials: options.trials,
  });

  return {
    report,
    result: {
      ...result,
      authMode: options.authMode,
      driver: driverId,
      leak: state.leak,
    },
  };
}
