/**
 * @description The CLI-driven system under test and its grader, in eval-core terms. Each trial runs a real agent
 * CLI through the core's driver iteration with the sandboxed MCP attached in place of the real server; the
 * grader reads the first OpenThrottle call from the trial's ATIF trajectory, cross-checks it against the sandbox
 * call log, and applies the unchanged {@link gradeCase} rules.
 *
 * Safety: a trajectory showing an OpenThrottle call the sandbox did not serve is a **leak** — some other server
 * answered — and every later trial in the run is refused before its CLI launches.
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type {
  EvalCase,
  EvalTrial,
  Grader,
  GraderVerdict,
  RunEvalIteration,
} from '@openthrottle/agentic-evals';

import type { SandboxToolCall } from '../sandbox/createSandboxMcpServer.ts';
import { cliSelectionOf } from './cli-selection.ts';
import {
  TOOL_SELECTION_GRADER_ID,
  TOOL_SELECTION_GRADER_VERSION,
} from './data/data.dataset.ts';
import type { ToolSelectionCase, TrialGrade } from './eval-case.ts';
import { gradeCase } from './gradeCase.ts';
import type { CliDriverId, SandboxLaunch } from './sandbox-attachment.ts';
import { writeSandboxAttachment } from './sandbox-attachment.ts';

/**
 * @description State shared by one run's iteration and grader: each trial's sandbox call log, and the first
 * leak, which stops the run. Mutable on purpose — it is the channel between the two.
 */
export interface CliRunState {
  readonly callLogs: Map<string, readonly SandboxToolCall[]>;
  leak: string | null;
}

/**
 * @description A fresh {@link CliRunState}.
 * @public
 */
export function createCliRunState(): CliRunState {
  return { callLogs: new Map(), leak: null };
}

/**
 * @description The key a trial's call log is stored under.
 * @public
 */
export function trialKey(caseId: string, attempt: number): string {
  return `${caseId}#${attempt}`;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const toSandboxCall = (value: unknown): SandboxToolCall | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const { args, tool, ts } = value;

  return typeof tool === 'string' && typeof ts === 'string' && isRecord(args)
    ? { args, tool, ts }
    : undefined;
};

/**
 * @description The calls a sandbox recorded, oldest first. A missing file means the CLI never called a tool (or
 * never started the server); an unparseable line is skipped rather than failing the trial.
 * @public
 */
export async function readCallLog(
  path: string,
): Promise<readonly SandboxToolCall[]> {
  const text = await readFile(path, 'utf8').catch(() => {
    return '';
  });

  return text
    .split('\n')
    .filter((line) => {
      return line.trim() !== '';
    })
    .flatMap((line) => {
      try {
        const call = toSandboxCall(JSON.parse(line));

        return call === undefined ? [] : [call];
      } catch {
        return [];
      }
    });
}

/**
 * @description Options for {@link createCliToolSelectionIteration}. `launchFor` builds the sandbox's stdio launch
 * for a trial's call-log path; `realBin` is the CLI the wrapper `exec`s.
 */
export interface CliToolSelectionIterationOptions {
  readonly driverId: CliDriverId;
  readonly launchFor: (callLogPath: string) => SandboxLaunch;
  readonly realBin: string;
  readonly runIteration: RunEvalIteration;
  readonly state: CliRunState;
}

/**
 * @description One trial: a private temp dir holding the sandbox wrapper and call log, the driver run with the
 * wrapper as its binary, then the call log stored for the grader. Refuses to launch once the run has leaked.
 * @public
 */
export const createCliToolSelectionIteration = (
  options: CliToolSelectionIterationOptions,
): RunEvalIteration => {
  const { driverId, launchFor, realBin, runIteration, state } = options;

  return async (input) => {
    if (state.leak !== null) {
      throw new Error(`not run: an earlier trial leaked (${state.leak})`);
    }
    const dir = await mkdtemp(join(tmpdir(), 'ot-sandbox-'));

    try {
      const callLogPath = join(dir, 'calls.jsonl');
      const attachmentEnv = await writeSandboxAttachment({
        dir,
        driverId,
        launch: launchFor(callLogPath),
        realBin,
      });
      const output = await runIteration({
        ...input,
        env: { ...input.env, ...attachmentEnv },
      });
      state.callLogs.set(
        trialKey(input.evalCase.id, input.attempt),
        await readCallLog(callLogPath),
      );

      return output;
    } finally {
      await rm(dir, { force: true, recursive: true });
    }
  };
};

/**
 * @description Options for {@link createCliToolSelectionGrader}.
 */
export interface CliToolSelectionGraderOptions {
  readonly cases: readonly ToolSelectionCase[];
  readonly onGrade: (caseId: string, grade: TrialGrade) => void;
  readonly otToolNames: ReadonlySet<string>;
  readonly state: CliRunState;
}

/**
 * @description {@link gradeCase} over a CLI trial. Uses the Messages API grader's id and version, so both runs fold
 * into baselines the same way. A leak or a trajectory/log disagreement is an `error` verdict, never a pass.
 * @public
 */
export const createCliToolSelectionGrader = (
  options: CliToolSelectionGraderOptions,
): Grader => {
  const { onGrade, otToolNames, state } = options;
  const byId = new Map(
    options.cases.map((testCase) => {
      return [testCase.id, testCase];
    }),
  );

  return {
    grade: async (
      trial: EvalTrial,
      evalCase: EvalCase,
    ): Promise<GraderVerdict> => {
      const testCase = byId.get(evalCase.id);
      if (testCase === undefined) {
        return { kind: 'error', reason: `unknown case ${evalCase.id}` };
      }
      if (trial.trajectory === null) {
        return { kind: 'error', reason: 'the trial recorded no trajectory' };
      }

      const outcome = cliSelectionOf(
        trial.trajectory.trajectory,
        state.callLogs.get(trialKey(trial.caseId, trial.attempt)) ?? [],
        otToolNames,
      );
      if (outcome.kind !== 'selection') {
        if (outcome.kind === 'leak') {
          state.leak = outcome.reason;
        }
        const reason = `${outcome.kind}: ${outcome.reason}`;
        onGrade(evalCase.id, { pass: false, reason });

        return { kind: 'error', reason };
      }

      const grade = gradeCase(testCase, outcome.selection, otToolNames);
      onGrade(evalCase.id, grade);

      return grade.pass
        ? { evidence: 'matched the expected first OT call', kind: 'pass' }
        : { evidence: grade.reason, kind: 'fail' };
    },
    id: TOOL_SELECTION_GRADER_ID,
    kind: 'code',
    version: TOOL_SELECTION_GRADER_VERSION,
  };
};
