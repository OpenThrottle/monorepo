import { readFileSync } from 'node:fs';
import { chmod, copyFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { AtifTrajectory } from '@openthrottle/openthrottle-agentic-utils';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type {
  EvalCase,
  EvalDataset,
  EvalRunConfig,
  Grader,
} from '../../types/index.ts';
import type { EvalWorkspaceFactory } from '../../workspace/index.ts';
import { noopWorkspaceFactory } from '../../workspace/index.ts';
import type {
  EvalDriverIterationOutput,
  RunEvalIteration,
} from '../runDriverIteration.ts';
import { runEval } from '../runEval.ts';

const FIXTURE = join(import.meta.dirname, 'fixtures', 'codex.synthetic.ndjson');

// The recorded codex stream reports 5400 input + 42 output tokens.
const TOKENS_PER_RUN = 5442;

const makeCase = (id: string): EvalCase => {
  return {
    gold: { text: 'DONE' },
    id,
    input: { cwdSetup: { files: [] }, prompt: `do ${id}` },
    split: 'dev',
  };
};

const dataset: EvalDataset = {
  cases: [makeCase('case-1'), makeCase('case-2')],
  id: 'ds',
  name: 'ds',
  version: 1,
};

const config: EvalRunConfig = {
  attempts: 2,
  authMode: 'api_key',
  budget: { maxTokens: null },
  concurrency: 1,
  driverId: 'codex',
  effort: undefined,
  model: undefined,
};

const okOutput: EvalDriverIterationOutput = {
  durationMs: 10,
  exitCode: 0,
  finalText: 'DONE',
  kind: 'driver',
  rawStdout: readFileSync(FIXTURE, 'utf8'),
  termination: 'exited',
  usageLimit: null,
};

const okIteration: RunEvalIteration = async () => {
  return okOutput;
};

const containsDone: Grader = {
  grade: async (trial) => {
    return trial.finalText.includes('DONE')
      ? { evidence: 'DONE found', kind: 'pass' }
      : { evidence: 'no DONE', kind: 'fail' };
  },
  id: 'contains-done',
  kind: 'code',
  version: '1',
};

interface Recorder {
  readonly created: string[];
  readonly disposed: string[];
  readonly factory: EvalWorkspaceFactory;
}

const recorder = (): Recorder => {
  const created: string[] = [];
  const disposed: string[] = [];

  return {
    created,
    disposed,
    factory: {
      create: async (evalCase, attempt) => {
        const cwd = `/virtual/${evalCase.id}/${attempt}`;

        created.push(cwd);

        return {
          cwd,
          dispose: async () => {
            disposed.push(cwd);
          },
        };
      },
    },
  };
};

describe('runEval with an injected iteration', () => {
  it('runs every case x attempt in its own workspace and grades each trial', async () => {
    const workspace = recorder();
    const result = await runEval({
      config,
      dataset,
      graders: [containsDone],
      runIteration: okIteration,
      workspace: workspace.factory,
    });

    expect(
      result.trials.map((trial) => `${trial.caseId}#${trial.attempt}`),
    ).toEqual(['case-1#1', 'case-1#2', 'case-2#1', 'case-2#2']);
    expect(result.trials.every((trial) => trial.status === 'completed')).toBe(
      true,
    );
    expect(result.grades).toHaveLength(4);
    expect(result.grades[0]).toMatchObject({
      costUsd: null,
      graderId: 'contains-done',
      graderVersion: '1',
      verdict: { kind: 'pass' },
    });
    expect(result.tokensUsed).toBe(4 * TOKENS_PER_RUN);
    expect(result.stopReason).toBeNull();
    expect(result.cursor).toBeNull();
    expect(workspace.created).toHaveLength(4);
    expect(new Set(workspace.created).size).toBe(4);
    expect(workspace.disposed).toEqual(workspace.created);
  });

  it('turns a crashing grader into an error verdict without aborting the run', async () => {
    const crashing: Grader = {
      grade: async () => {
        throw new Error('grader blew up');
      },
      id: 'crash',
      kind: 'judge',
      version: '1',
    };
    const result = await runEval({
      config: { ...config, attempts: 1 },
      dataset,
      graders: [crashing, containsDone],
      runIteration: okIteration,
      workspace: recorder().factory,
    });

    expect(result.grades).toHaveLength(4);
    expect(result.grades[0]?.verdict).toEqual({
      kind: 'error',
      reason: 'grader blew up',
    });
    expect(result.grades[1]?.verdict.kind).toBe('pass');
  });

  it('records a workspace or agent failure as an errored trial with error verdicts', async () => {
    const failingWorkspace: EvalWorkspaceFactory = {
      create: async () => {
        throw new Error('no disk');
      },
    };
    const noWorkspace = await runEval({
      config: { ...config, attempts: 1 },
      dataset,
      graders: [containsDone],
      runIteration: okIteration,
      workspace: failingWorkspace,
    });

    expect(noWorkspace.trials[0]).toMatchObject({
      error: 'no disk',
      status: 'errored',
    });
    expect(noWorkspace.grades[0]?.verdict).toEqual({
      kind: 'error',
      reason: 'no disk',
    });

    const workspace = recorder();
    const crashed = await runEval({
      config: { ...config, attempts: 1 },
      dataset,
      graders: [containsDone],
      runIteration: async () => {
        throw new Error('spawn failed');
      },
      workspace: workspace.factory,
    });

    expect(crashed.trials[0]).toMatchObject({
      error: 'spawn failed',
      status: 'errored',
    });
    expect(workspace.disposed).toHaveLength(2);
  });

  it('marks a run with no structured output or a timeout as errored', async () => {
    const prose = await runEval({
      config: { ...config, attempts: 1 },
      dataset: { ...dataset, cases: [makeCase('a')] },
      graders: [containsDone],
      runIteration: async () => {
        return { ...okOutput, rawStdout: 'Not logged in' };
      },
      workspace: recorder().factory,
    });
    const timedOut = await runEval({
      config: { ...config, attempts: 1 },
      dataset: { ...dataset, cases: [makeCase('a')] },
      graders: [containsDone],
      runIteration: async () => {
        return { ...okOutput, exitCode: null, termination: 'timed-out' };
      },
      workspace: recorder().factory,
    });

    expect(prose.trials[0]?.error).toMatch(/no structured output/);
    expect(timedOut.trials[0]?.error).toMatch(/timed-out/);
  });

  it('stops scheduling once the token budget is reached and resumes from the cursor', async () => {
    const budgeted = await runEval({
      config: { ...config, budget: { maxTokens: 5000 } },
      dataset,
      graders: [containsDone],
      runIteration: okIteration,
      workspace: recorder().factory,
    });

    expect(budgeted.trials).toHaveLength(1);
    expect(budgeted.stopReason).toBe('budget');
    expect(budgeted.cursor).toEqual({ attempt: 2, caseId: 'case-1' });

    const resumed = await runEval({
      config,
      dataset,
      graders: [containsDone],
      resumeFrom: budgeted.cursor ?? undefined,
      runIteration: okIteration,
      workspace: recorder().factory,
    });

    expect(
      resumed.trials.map((trial) => `${trial.caseId}#${trial.attempt}`),
    ).toEqual(['case-1#2', 'case-2#1', 'case-2#2']);
    expect(resumed.cursor).toBeNull();
  });

  it('pauses on a usage limit: no grades for that trial, a cursor to resume from', async () => {
    let calls = 0;
    const result = await runEval({
      config,
      dataset,
      graders: [containsDone],
      runIteration: async () => {
        calls += 1;

        if (calls === 2) {
          return {
            ...okOutput,
            usageLimit: { rateLimitType: 'five_hour', resetsAt: null },
          };
        }

        return okOutput;
      },
      workspace: recorder().factory,
    });

    expect(result.trials.map((trial) => trial.status)).toEqual([
      'completed',
      'usage_limited',
    ]);
    expect(result.grades).toHaveLength(1);
    expect(result.stopReason).toBe('usage_limit');
    expect(result.cursor).toEqual({ attempt: 2, caseId: 'case-1' });
    expect(calls).toBe(2);
  });

  it('runs sequentially by default and up to `concurrency` at once otherwise', async () => {
    const measure = async (concurrency: number): Promise<number> => {
      let active = 0;
      let peak = 0;

      await runEval({
        config: { ...config, concurrency },
        dataset,
        graders: [],
        runIteration: async () => {
          active += 1;
          peak = Math.max(peak, active);
          // A macrotask yield lets the pool start its next worker while this one is in flight.
          await new Promise((resolve) => setTimeout(resolve, 0));
          active -= 1;

          return okOutput;
        },
        workspace: recorder().factory,
      });

      return peak;
    };

    expect(await measure(1)).toBe(1);
    expect(await measure(2)).toBe(2);
  });

  it('lets graders inspect the workspace before it is disposed', async () => {
    const seen: string[] = [];
    const workspace = recorder();
    const probe: Grader = {
      grade: async (trial) => {
        seen.push(`${trial.workspaceCwd}:${workspace.disposed.length}`);

        return { evidence: 'ok', kind: 'pass' };
      },
      id: 'probe',
      kind: 'code',
      version: '1',
    };

    await runEval({
      config: { ...config, attempts: 1 },
      dataset: { ...dataset, cases: [makeCase('a')] },
      graders: [probe],
      runIteration: okIteration,
      workspace: workspace.factory,
    });

    expect(seen).toEqual(['/virtual/a/1:0']);
  });
});

const trajectory: AtifTrajectory = {
  agent: { name: 'fake-model-call', version: '1' },
  final_metrics: { total_completion_tokens: 3, total_prompt_tokens: 7 },
  schema_version: 'ATIF-v1.8',
  steps: [
    {
      message: 'DONE',
      metrics: { completion_tokens: 3, prompt_tokens: 7 },
      source: 'agent',
      step_id: 1,
      tool_calls: [
        {
          arguments: { id: 'x' },
          function_name: 'get_plan',
          tool_call_id: 'call-1',
        },
      ],
    },
  ],
};

describe('runEval with a trajectory iteration', () => {
  const trajectoryIteration: RunEvalIteration = async () => {
    return {
      durationMs: 5,
      finalText: 'DONE',
      kind: 'trajectory',
      trajectory,
    };
  };

  it('stores the prebuilt trajectory, counts its tokens and grades it, with no workspace', async () => {
    const seen: (string | undefined)[] = [];
    const reader: Grader = {
      grade: async (trial) => {
        seen.push(
          trial.trajectory?.trajectory.steps[0]?.tool_calls?.[0]?.function_name,
        );

        return { evidence: 'read the call', kind: 'pass' };
      },
      id: 'reader',
      kind: 'code',
      version: '1',
    };
    const result = await runEval({
      config: { ...config, attempts: 1 },
      dataset,
      graders: [reader],
      runIteration: trajectoryIteration,
      workspace: noopWorkspaceFactory,
    });

    expect(seen).toEqual(['get_plan', 'get_plan']);
    expect(result.trials.map((trial) => trial.status)).toEqual([
      'completed',
      'completed',
    ]);
    expect(result.trials[0]?.trajectory).toMatchObject({
      durationMs: 5,
      outcome: 'succeeded',
      truncated: false,
    });
    expect(result.trials[0]?.trajectory?.trajectoryJson).toBe(
      JSON.stringify(trajectory),
    );
    expect(result.tokensUsed).toBe(2 * 10);
    expect(result.grades.every((g) => g.verdict.kind === 'pass')).toBe(true);
  });

  it('records a rejecting iteration as an errored trial, never a fail', async () => {
    const result = await runEval({
      config: { ...config, attempts: 1 },
      dataset,
      graders: [containsDone],
      runIteration: async () => {
        throw new Error('refusal: declined');
      },
      workspace: noopWorkspaceFactory,
    });

    expect(result.trials.map((trial) => trial.status)).toEqual([
      'errored',
      'errored',
    ]);
    expect(result.grades[0]?.verdict).toEqual({
      kind: 'error',
      reason: 'refusal: declined',
    });
  });
});

describe('noopWorkspaceFactory', () => {
  it('hands out an existing directory and a harmless dispose', async () => {
    const created = await noopWorkspaceFactory.create(makeCase('c'), 1);

    expect(created.cwd).not.toBe('');
    await expect(created.dispose()).resolves.toBeUndefined();
  });
});

describe('runEval through the real driver with a stub binary', () => {
  let stubDir = '';

  beforeAll(async () => {
    stubDir = await mkdtemp(join(tmpdir(), 'ot-eval-stub-'));
    await copyFile(FIXTURE, join(stubDir, 'canned.ndjson'));
    // The codex driver runs `codex exec --json ...` off PATH, so a script named `codex` earlier on
    // PATH stands in for the CLI and prints the recorded structured stream.
    await writeFile(
      join(stubDir, 'codex'),
      `#!/bin/sh\ncat "${join(stubDir, 'canned.ndjson')}"\n`,
    );
    await chmod(join(stubDir, 'codex'), 0o755);
  });

  afterAll(async () => {
    await rm(stubDir, { force: true, recursive: true });
  });

  it('spawns the CLI, reads its structured stream into a trajectory and grades it', async () => {
    const workspace = recorder();
    const result = await runEval({
      config: { ...config, attempts: 1 },
      dataset: { ...dataset, cases: [makeCase('stub-case')] },
      env: { PATH: `${stubDir}:${process.env.PATH ?? ''}` },
      graders: [containsDone],
      workspace: {
        create: async (evalCase, attempt) => {
          const created = await workspace.factory.create(evalCase, attempt);

          return { ...created, cwd: stubDir };
        },
      },
    });
    const trial = result.trials[0];
    const steps = trial?.trajectory?.trajectory.steps ?? [];

    expect(trial?.status).toBe('completed');
    expect(trial?.error).toBeNull();
    expect(trial?.finalText).toContain('DONE');
    expect(trial?.trajectory?.exitCode).toBe(0);
    expect(trial?.trajectory?.outcome).toBe('succeeded');
    expect(steps.some((step) => (step.tool_calls?.length ?? 0) > 0)).toBe(true);
    expect(result.tokensUsed).toBe(TOKENS_PER_RUN);
    expect(result.grades).toHaveLength(1);
    expect(result.grades[0]?.verdict).toEqual({
      evidence: 'DONE found',
      kind: 'pass',
    });
  });
});
