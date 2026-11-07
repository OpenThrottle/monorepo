import type { TrajectoryRecord } from '@openthrottle/openthrottle-agentic-utils';
import {
  buildTrajectoryRecord,
  summarizeTrajectory,
} from '@openthrottle/openthrottle-agentic-utils';
import { getDriver } from '@openthrottle/openthrottle-drivers';

import type {
  EvalCase,
  EvalDataset,
  EvalGrade,
  EvalRunConfig,
  EvalTrial,
  Grader,
  GraderVerdict,
} from '../types/index.ts';
import type { EvalWorkspaceFactory } from '../workspace/index.ts';
import type {
  EvalDriverIterationOutput,
  EvalIterationOutput,
  EvalTrajectoryIterationOutput,
  RunEvalIteration,
} from './eval-iteration.ts';
import { runDriverIteration } from './eval-iteration.ts';

/**
 * @description The next (case, attempt) to run. Attempts count from 1.
 * @public
 */
export interface EvalCursor {
  readonly attempt: number;
  readonly caseId: string;
}

/**
 * @description Why scheduling stopped early. `null` in the result means every attempt ran.
 * @public
 */
export type EvalStopReason = 'budget' | 'usage_limit';

/**
 * @description Everything {@link runEval} needs. `env` is merged over the child's environment
 * (credentials, a PATH override); `resumeFrom` skips every attempt before that cursor.
 * @public
 */
export interface RunEvalInput {
  readonly config: EvalRunConfig;
  readonly dataset: EvalDataset;
  readonly env?: Readonly<Record<string, string>>;
  readonly graders: readonly Grader[];
  readonly resumeFrom?: EvalCursor;
  readonly runIteration?: RunEvalIteration;
  readonly timeoutMs?: number;
  readonly workspace: EvalWorkspaceFactory;
}

/**
 * @description A run's outcome. `cursor` is the first attempt without a finished trial (a
 * `usage_limited` one counts as unfinished), or `null` when nothing is left. `tokensUsed` sums
 * input and output tokens of the trials that reported any.
 * @public
 */
export interface EvalRunResult {
  readonly cursor: EvalCursor | null;
  readonly grades: readonly EvalGrade[];
  readonly stopReason: EvalStopReason | null;
  readonly tokensUsed: number;
  readonly trials: readonly EvalTrial[];
}

interface Unit {
  readonly attempt: number;
  readonly evalCase: EvalCase;
}

interface RunState {
  nextIndex: number;
  stopReason: EvalStopReason | null;
  tokensUsed: number;
}

interface UnitOutcome {
  readonly grades: readonly EvalGrade[];
  readonly tokens: number;
  readonly trial: EvalTrial;
}

const errorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

const buildUnits = (
  dataset: EvalDataset,
  attempts: number,
): readonly Unit[] => {
  return dataset.cases.flatMap((evalCase) => {
    return Array.from({ length: attempts }, (_, index) => {
      return { attempt: index + 1, evalCase };
    });
  });
};

const startIndexOf = (
  units: readonly Unit[],
  resumeFrom: EvalCursor | undefined,
): number => {
  if (resumeFrom === undefined) {
    return 0;
  }

  const index = units.findIndex((unit) => {
    return (
      unit.evalCase.id === resumeFrom.caseId &&
      unit.attempt === resumeFrom.attempt
    );
  });

  return index === -1 ? 0 : index;
};

const tokensOf = (record: TrajectoryRecord | null): number => {
  if (record === null) {
    return 0;
  }

  const summary = summarizeTrajectory(record.trajectory);

  return (summary.inputTokens ?? 0) + (summary.outputTokens ?? 0);
};

const outcomeLabel = (output: EvalDriverIterationOutput): string => {
  if (output.termination === 'exited') {
    return output.exitCode === 0 ? 'succeeded' : 'failed';
  }

  return output.termination === 'timed-out' ? 'timed_out' : 'aborted';
};

interface TrialFacts {
  readonly error: string | null;
  readonly finalText: string;
  readonly status: EvalTrial['status'];
  readonly trajectory: TrajectoryRecord | null;
}

const interpretOutput = (
  output: EvalDriverIterationOutput,
  record: TrajectoryRecord | undefined,
): TrialFacts => {
  const trajectory = record ?? null;
  const base = { finalText: output.finalText, trajectory };

  if (output.usageLimit !== null) {
    return { ...base, error: null, status: 'usage_limited' };
  }

  if (output.termination !== 'exited') {
    return {
      ...base,
      error: `The agent run ended: ${output.termination}.`,
      status: 'errored',
    };
  }

  if (record === undefined) {
    return {
      ...base,
      error: 'The agent produced no structured output.',
      status: 'errored',
    };
  }

  return { ...base, error: null, status: 'completed' };
};

const trajectoryFacts = (output: EvalTrajectoryIterationOutput): TrialFacts => {
  return {
    error: null,
    finalText: output.finalText,
    status: 'completed',
    trajectory: {
      durationMs: output.durationMs,
      exitCode: 0,
      outcome: 'succeeded',
      trajectory: output.trajectory,
      trajectoryJson: JSON.stringify(output.trajectory),
      truncated: false,
    },
  };
};

const driverFacts = (
  output: EvalDriverIterationOutput,
  unit: Unit,
  config: EvalRunConfig,
): TrialFacts => {
  const { attempt, evalCase } = unit;
  const driver = getDriver(config.driverId);
  const record = buildTrajectoryRecord({
    agentVersion: 'unknown',
    driverId: config.driverId,
    durationMs: output.durationMs,
    exitCode: output.exitCode,
    model: config.model,
    openthrottle: { attempt, caseId: evalCase.id },
    outcome: outcomeLabel(output),
    prompt: evalCase.input.prompt,
    rawStdout: output.rawStdout,
    reportsToolCalls: driver.capabilities.reportsToolCalls,
  });

  return interpretOutput(output, record);
};

const trialFactsOf = (
  output: EvalIterationOutput,
  unit: Unit,
  config: EvalRunConfig,
): TrialFacts => {
  if (output.kind === 'trajectory') {
    return trajectoryFacts(output);
  }

  return driverFacts(output, unit, config);
};

const gradeSafely = async (
  grader: Grader,
  trial: EvalTrial,
  evalCase: EvalCase,
): Promise<GraderVerdict> => {
  try {
    return await grader.grade(trial, evalCase);
  } catch (error) {
    return { kind: 'error', reason: errorMessage(error) };
  }
};

const gradeTrial = async (
  graders: readonly Grader[],
  trial: EvalTrial,
  evalCase: EvalCase,
): Promise<readonly EvalGrade[]> => {
  if (trial.status === 'usage_limited') {
    return [];
  }

  const isErrored = trial.status === 'errored';
  const errorVerdict: GraderVerdict = {
    kind: 'error',
    reason: trial.error ?? 'The trial errored.',
  };

  return Promise.all(
    graders.map(async (grader): Promise<EvalGrade> => {
      const verdict = isErrored
        ? errorVerdict
        : await gradeSafely(grader, trial, evalCase);

      return {
        attempt: trial.attempt,
        caseId: trial.caseId,
        costUsd: null,
        graderId: grader.id,
        graderVersion: grader.version,
        verdict,
      };
    }),
  );
};

const erroredTrial = (unit: Unit, message: string, cwd: string): EvalTrial => {
  return {
    attempt: unit.attempt,
    caseId: unit.evalCase.id,
    error: message,
    finalText: '',
    status: 'errored',
    trajectory: null,
    workspaceCwd: cwd,
  };
};

const runUnit = async (
  unit: Unit,
  input: RunEvalInput,
  runIteration: RunEvalIteration,
): Promise<UnitOutcome> => {
  const { config, env, graders, timeoutMs, workspace } = input;
  const { attempt, evalCase } = unit;

  let created: Awaited<ReturnType<EvalWorkspaceFactory['create']>>;

  try {
    created = await workspace.create(evalCase, attempt);
  } catch (error) {
    const trial = erroredTrial(unit, errorMessage(error), '');

    return {
      grades: await gradeTrial(graders, trial, evalCase),
      tokens: 0,
      trial,
    };
  }

  try {
    let trial: EvalTrial;

    try {
      const output = await runIteration({
        attempt,
        config,
        cwd: created.cwd,
        env,
        evalCase,
        timeoutMs,
      });
      const facts = trialFactsOf(output, unit, config);

      trial = {
        attempt,
        caseId: evalCase.id,
        workspaceCwd: created.cwd,
        ...facts,
      };
    } catch (error) {
      trial = erroredTrial(unit, errorMessage(error), created.cwd);
    }

    const grades = await gradeTrial(graders, trial, evalCase);

    return { grades, tokens: tokensOf(trial.trajectory), trial };
  } finally {
    // A failed cleanup must not turn a graded trial into a crashed run.
    await created.dispose().catch(() => undefined);
  }
};

const findCursor = (
  units: readonly Unit[],
  outcomes: readonly (UnitOutcome | undefined)[],
  start: number,
): EvalCursor | null => {
  const index = units.findIndex((_, position) => {
    const status = outcomes[position]?.trial.status;

    return (
      position >= start && (status === undefined || status === 'usage_limited')
    );
  });
  const unit = units[index];

  return unit === undefined
    ? null
    : { attempt: unit.attempt, caseId: unit.evalCase.id };
};

/**
 * @description Runs every case for `config.attempts` attempts, each in its own workspace, then
 * grades each finished trial with every grader. Fail-soft: a launch failure or a crashing grader
 * yields an `errored` trial or an `error` verdict, never a rejected run. Attempts are never cached.
 *
 * Scheduling stops, with a resumable `cursor`, once the token budget is reached or a trial hits a
 * subscription usage limit. A `usage_limited` trial gets no grades, so pass rates leave it out.
 * With `concurrency` above 1 attempts already in flight when scheduling stops still finish, so
 * `cursor` can sit before some completed trials; resuming re-runs those.
 * @public
 */
export const runEval = async (input: RunEvalInput): Promise<EvalRunResult> => {
  const { config, dataset, resumeFrom } = input;
  const runIteration = input.runIteration ?? runDriverIteration;
  const units = buildUnits(dataset, config.attempts);
  const start = startIndexOf(units, resumeFrom);
  const outcomes: (UnitOutcome | undefined)[] = [];
  const maxTokens = config.budget.maxTokens;
  const state: RunState = {
    nextIndex: start,
    stopReason: null,
    tokensUsed: 0,
  };

  // Recursion rather than a loop: each worker takes the next attempt only after the previous one
  // finished, which is sequential at concurrency 1 and a bounded pool above it.
  const worker = async (): Promise<void> => {
    const index = state.nextIndex;
    const unit = units[index];

    if (state.stopReason !== null || unit === undefined) {
      return;
    }

    state.nextIndex += 1;

    const outcome = await runUnit(unit, input, runIteration);

    outcomes[index] = outcome;
    state.tokensUsed += outcome.tokens;

    if (outcome.trial.status === 'usage_limited') {
      state.stopReason = 'usage_limit';
    } else if (maxTokens !== null && state.tokensUsed >= maxTokens) {
      state.stopReason ??= 'budget';
    }

    await worker();
  };

  const width = Math.max(1, Math.floor(config.concurrency));

  await Promise.all(
    Array.from({ length: width }, () => {
      return worker();
    }),
  );

  const finished = outcomes.flatMap((outcome) => {
    return outcome === undefined ? [] : [outcome];
  });

  return {
    cursor: findCursor(units, outcomes, start),
    grades: finished.flatMap((outcome) => {
      return outcome.grades;
    }),
    stopReason: state.stopReason,
    tokensUsed: state.tokensUsed,
    trials: finished.map((outcome) => {
      return outcome.trial;
    }),
  };
};
