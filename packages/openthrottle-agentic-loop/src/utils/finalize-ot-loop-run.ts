import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type {
  WorkflowExecuteGraphqlV2,
  WorkflowRalphCommandResult,
  WorkflowRalphCommandRunner,
  WorkflowRalphIterationOnChunk,
  WorkflowRunResult,
} from '@openthrottle/openthrottle-agentic-ralph';
import {
  finalizeHandoffOwed,
  finalizePlanRun,
} from '@openthrottle/openthrottle-agentic-ralph';

import {
  COMMIT_TEMP_PREFIX,
  FINALIZE_PRIOR_REASONS,
  SQUASH_FALLBACK_SUBJECT,
} from '../data/data.git.ts';
import { appendCommitFooters } from './append-commit-footers.ts';

/** @public */
export interface FinalizeOtLoopRunParams {
  readonly baseBranch: string;
  readonly cwd: string;
  readonly draftDir: string | undefined;
  readonly executeGraphqlV2: WorkflowExecuteGraphqlV2;
  readonly onChunk: WorkflowRalphIterationOnChunk | undefined;
  /** `complete` (every task resolved) or `tasks_blocked` (any BLOCKED); the PR is a draft either way. */
  readonly outcome: 'complete' | 'tasks_blocked';
  readonly planId: string;
  readonly runCommand: WorkflowRalphCommandRunner;
  /** Squash commit header; `undefined` reuses the oldest commit's header in the range. */
  readonly squashSubject: string | undefined;
  /** Ids of the plan's COMPLETED tasks from OT, in task order; commitless tasks are carried too. */
  readonly taskIds: readonly string[];
}

interface Failure {
  readonly detail: string;
  readonly ok: false;
  readonly owedStep: string;
}

type Step<T> = Failure | { readonly ok: true; readonly value: T };

interface Context {
  readonly baseBranch: string;
  readonly git: (
    args: readonly string[],
  ) => Promise<WorkflowRalphCommandResult>;
  readonly params: FinalizeOtLoopRunParams;
  readonly rev: (
    args: readonly string[],
    step: string,
  ) => Promise<Step<string>>;
}

interface Prepared {
  readonly baseSha: string;
  readonly preHead: string;
  readonly remoteExists: boolean;
  readonly squashBase: string;
}

interface RangeInfo {
  readonly carried: readonly string[];
  readonly subjects: readonly string[];
  readonly taskIds: readonly string[];
  readonly touched: ReadonlySet<string>;
}

const TASK_ID_FOOTER = /^Task-Id:[ \t]*(\S+)[ \t]*$/gm;
const CARRIED_FOOTER =
  /^((?:Closes|Fixes|Resolves) #\d+|BREAKING CHANGE:.*)$/gm;

const outputOf = (result: WorkflowRalphCommandResult): string => {
  return result.stderr.trim() || result.stdout.trim();
};

const fail = (owedStep: string, detail: string): Failure => {
  return { detail, ok: false, owedStep };
};

const succeed = <T>(value: T): Step<T> => {
  return { ok: true, value };
};

const unique = (values: readonly string[]): string[] => {
  return [...new Set(values)];
};

const findAll = (text: string, pattern: RegExp): string[] => {
  return [...text.matchAll(pattern)].flatMap((match) => {
    const value = match[1];

    return value === undefined ? [] : [value.trim()];
  });
};

const lines = (text: string): string[] => {
  return text.split('\n').filter((line) => line.trim() !== '');
};

const nulSeparated = (text: string): string[] => {
  return text.split('\0').filter((entry) => entry !== '');
};

/** Fetch + merge-base: where the squash starts and where HEAD is now. */
const prepareSquash = async (ctx: Context): Promise<Step<Prepared>> => {
  const { baseBranch, git, rev } = ctx;
  const branch = await rev(
    ['rev-parse', '--abbrev-ref', 'HEAD'],
    'resolve-branch',
  );

  if (!branch.ok) {
    return branch;
  }

  if (branch.value === 'HEAD') {
    return fail('resolve-branch', 'HEAD is detached; no branch to finalize');
  }

  // Fetch FIRST, with an explicit refspec so the remote-tracking ref is updated whatever the
  // clone's configured refspec is. A stale `origin/<base>` is the #589/#590 revert.
  const fetched = await git([
    'fetch',
    'origin',
    `+refs/heads/${baseBranch}:refs/remotes/origin/${baseBranch}`,
  ]);

  if (fetched.exitCode !== 0) {
    return fail(
      'git-fetch',
      outputOf(fetched) || `git fetch origin ${baseBranch} failed`,
    );
  }

  const [baseSha, preHead, remote] = await Promise.all([
    rev(
      ['rev-parse', '--verify', `refs/remotes/origin/${baseBranch}`],
      'git-fetch',
    ),
    rev(['rev-parse', 'HEAD'], 'resolve-head'),
    resolveRemoteBranch(ctx, branch.value),
  ]);

  if (!baseSha.ok) {
    return baseSha;
  }

  if (!preHead.ok) {
    return preHead;
  }

  if (!remote.ok) {
    return remote;
  }

  if (remote.value !== undefined) {
    // Re-run on an already-pushed branch: squash only what comes after the pushed tip.
    return succeed({
      baseSha: baseSha.value,
      preHead: preHead.value,
      remoteExists: true,
      squashBase: remote.value,
    });
  }

  const mergeBase = await rev(
    ['merge-base', 'HEAD', baseSha.value],
    'merge-base',
  );

  if (!mergeBase.ok) {
    return mergeBase;
  }

  return succeed({
    baseSha: baseSha.value,
    preHead: preHead.value,
    remoteExists: false,
    squashBase: mergeBase.value,
  });
};

/** The pushed tip of `origin/<branch>` (fetched), `undefined` when the branch was never pushed. */
const resolveRemoteBranch = async (
  ctx: Context,
  branch: string,
): Promise<Step<string | undefined>> => {
  const { git, rev } = ctx;
  const listed = await git([
    'ls-remote',
    '--exit-code',
    '--heads',
    'origin',
    `refs/heads/${branch}`,
  ]);

  // `--exit-code` exits 2 when no ref matched.
  if (listed.exitCode === 2) {
    return succeed(undefined);
  }

  if (listed.exitCode !== 0) {
    return fail('git-ls-remote', outputOf(listed) || 'git ls-remote failed');
  }

  const fetched = await git([
    'fetch',
    'origin',
    `+refs/heads/${branch}:refs/remotes/origin/${branch}`,
  ]);

  if (fetched.exitCode !== 0) {
    return fail(
      'git-fetch',
      outputOf(fetched) || `git fetch origin ${branch} failed`,
    );
  }

  const tip = await rev(
    ['rev-parse', '--verify', `refs/remotes/origin/${branch}`],
    'git-fetch',
  );

  if (!tip.ok) {
    return tip;
  }

  const ancestor = await git([
    'merge-base',
    '--is-ancestor',
    tip.value,
    'HEAD',
  ]);

  if (ancestor.exitCode !== 0) {
    return fail(
      'branch-diverged',
      `origin/${branch} (${tip.value}) is not an ancestor of HEAD; pushing would need a force-push, which only a human may do`,
    );
  }

  return succeed(tip.value);
};

const readRange = async (
  ctx: Context,
  squashBase: string,
): Promise<Step<RangeInfo>> => {
  const { git } = ctx;
  const range = `${squashBase}..HEAD`;
  const [subjects, bodies, files] = await Promise.all([
    git(['log', '--reverse', '--format=%s', range]),
    git(['log', '--format=%B', range]),
    git(['log', '--name-only', '--no-renames', '-z', '--format=', range]),
  ]);

  for (const result of [subjects, bodies, files]) {
    if (result.exitCode !== 0) {
      return fail(
        'squash-range',
        outputOf(result) || `git log ${range} failed`,
      );
    }
  }

  return succeed({
    carried: unique(findAll(bodies.stdout, CARRIED_FOOTER)),
    subjects: lines(subjects.stdout),
    taskIds: unique(findAll(bodies.stdout, TASK_ID_FOOTER)),
    touched: new Set(nulSeparated(files.stdout)),
  });
};

/** Task ids that already landed: on `origin/<base>`, or on this branch below the squash base. */
const readDelivered = async (
  ctx: Context,
  prepared: Prepared,
): Promise<Step<ReadonlySet<string>>> => {
  const { git } = ctx;
  const { baseSha, preHead, remoteExists, squashBase } = prepared;
  const onBase = await git(['log', baseSha, '--grep=^Task-Id:', '--format=%B']);

  if (onBase.exitCode !== 0) {
    return fail(
      'squash-range',
      outputOf(onBase) || 'git log of the base failed',
    );
  }

  const delivered = new Set(findAll(onBase.stdout, TASK_ID_FOOTER));

  if (!remoteExists) {
    return succeed(delivered);
  }

  const pushed = await git(['log', '--format=%B', `${baseSha}..${squashBase}`]);

  if (pushed.exitCode !== 0) {
    return fail(
      'squash-range',
      outputOf(pushed) || `git log ${preHead} failed`,
    );
  }

  findAll(pushed.stdout, TASK_ID_FOOTER).forEach((id) => delivered.add(id));

  return succeed(delivered);
};

const buildSquashMessage = (input: {
  readonly delivered: ReadonlySet<string>;
  readonly planId: string;
  readonly range: RangeInfo;
  readonly squashSubject: string | undefined;
  readonly taskIds: readonly string[];
}): string => {
  const { delivered, planId, range, squashSubject, taskIds } = input;
  const subject =
    squashSubject?.trim() || range.subjects[0] || SQUASH_FALLBACK_SUBJECT;
  const bullets = range.subjects.map((line) => `- ${line}`).join('\n');
  const body = range.subjects.length > 1 ? `\n\n${bullets}` : '';
  // OT is the authority (commitless tasks); git's own footers are the cross-check and never dropped.
  const ids = unique([
    ...taskIds.filter((id) => !delivered.has(id)),
    ...range.taskIds,
  ]);

  return appendCommitFooters(`${subject}${body}`, [
    `Plan-Id: ${planId}`,
    ...ids.map((id) => `Task-Id: ${id}`),
    ...range.carried,
  ]);
};

const foreignFiles = async (
  ctx: Context,
  base: string,
  touched: ReadonlySet<string>,
  cached: boolean,
): Promise<Step<readonly string[]>> => {
  const args = cached
    ? ['diff', '--cached', '--name-only', '--no-renames', '-z']
    : ['diff', '--name-only', '--no-renames', '-z', base, 'HEAD'];
  const diff = await ctx.git(args);

  return diff.exitCode === 0
    ? succeed(nulSeparated(diff.stdout).filter((file) => !touched.has(file)))
    : fail('squash-guard', outputOf(diff) || 'git diff failed');
};

const rollback = async (ctx: Context, preHead: string): Promise<void> => {
  // Soft: HEAD returns to the per-task commits, the index and worktree stay as they are.
  await ctx.git(['reset', '--soft', preHead]);
};

const guardFailure = (files: readonly string[], base: string): Failure => {
  return fail(
    'squash-guard',
    `squash diff against ${base} touches files none of this branch's commits touched (stale-base revert guard): ${files.join(', ')}`,
  );
};

const commitSquash = async (
  ctx: Context,
  message: string,
): Promise<WorkflowRalphCommandResult> => {
  const dir = await mkdtemp(join(tmpdir(), COMMIT_TEMP_PREFIX));

  try {
    const file = join(dir, 'COMMIT_EDITMSG');

    await writeFile(file, message, 'utf8');

    return await ctx.git(['commit', '-F', file]);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
};

/** Soft-reset to the squash base, verify the diff, commit once. Returns the touched set. */
const squashRange = async (
  ctx: Context,
  prepared: Prepared,
): Promise<Step<ReadonlySet<string> | undefined>> => {
  const { git, params } = ctx;
  const { preHead, squashBase } = prepared;
  const [range, delivered] = await Promise.all([
    readRange(ctx, squashBase),
    readDelivered(ctx, prepared),
  ]);

  if (!range.ok) {
    return range;
  }

  if (!delivered.ok) {
    return delivered;
  }

  if (range.value.subjects.length === 0) {
    return succeed(undefined);
  }

  const message = buildSquashMessage({
    delivered: delivered.value,
    planId: params.planId,
    range: range.value,
    squashSubject: params.squashSubject,
    taskIds: params.taskIds,
  });
  const reset = await git(['reset', '--soft', squashBase]);

  if (reset.exitCode !== 0) {
    return fail('squash-reset', outputOf(reset) || 'git reset --soft failed');
  }

  const staged = await foreignFiles(ctx, squashBase, range.value.touched, true);

  if (!staged.ok || staged.value.length > 0) {
    await rollback(ctx, preHead);

    return staged.ok ? guardFailure(staged.value, squashBase) : staged;
  }

  const committed = await commitSquash(ctx, message);

  if (committed.exitCode !== 0) {
    await rollback(ctx, preHead);

    return fail('squash-commit', outputOf(committed) || 'git commit failed');
  }

  const landed = await foreignFiles(
    ctx,
    squashBase,
    range.value.touched,
    false,
  );

  if (!landed.ok || landed.value.length > 0) {
    await rollback(ctx, preHead);

    return landed.ok ? guardFailure(landed.value, squashBase) : landed;
  }

  return succeed(range.value.touched);
};

/** A never-pushed branch is rebased onto the fetched base; the result is guarded again. */
const rebaseOntoBase = async (
  ctx: Context,
  prepared: Prepared,
  touched: ReadonlySet<string>,
): Promise<Step<null>> => {
  const { git } = ctx;
  const { baseSha, preHead } = prepared;
  const behind = await git(['merge-base', '--is-ancestor', baseSha, 'HEAD']);

  if (behind.exitCode === 0) {
    return succeed(null);
  }

  const rebased = await git(['rebase', baseSha]);

  if (rebased.exitCode !== 0) {
    await git(['rebase', '--abort']);

    return fail('rebase', outputOf(rebased) || `git rebase ${baseSha} failed`);
  }

  const foreign = await foreignFiles(ctx, baseSha, touched, false);

  if (!foreign.ok || foreign.value.length > 0) {
    await rollback(ctx, preHead);

    return foreign.ok ? guardFailure(foreign.value, baseSha) : foreign;
  }

  return succeed(null);
};

/**
 * @description Finish of an OT Loop run (docs § 7): fetch `origin/<base>`, squash onto the
 * merge-base with the freshly fetched ref (or, on a re-run of an already-pushed branch, only the
 * commits after `origin/<branch>`), refuse unless the squash diff touches only files this branch's
 * commits touched (the #590 guard), rebase a never-pushed branch onto the fetched base, then hand
 * push and draft-PR creation to `finalizePlanRun` with `markReady: false`. Never force-pushes and
 * never `--no-verify`. A failed step leaves the worktree as it was and returns
 * `workflow_complete_handoff_owed` with the owed-step line in plan output.
 * @public
 */
export const finalizeOtLoopRun = async (
  params: FinalizeOtLoopRunParams,
): Promise<WorkflowRunResult> => {
  const { baseBranch, cwd, runCommand } = params;
  const git = (
    args: readonly string[],
  ): Promise<WorkflowRalphCommandResult> => {
    return runCommand({ args, command: 'git', cwd });
  };
  const rev = async (
    args: readonly string[],
    step: string,
  ): Promise<Step<string>> => {
    const result = await git(args);
    const value = result.stdout.trim();

    return result.exitCode === 0 && value !== ''
      ? succeed(value)
      : fail(step, outputOf(result) || `git ${args.join(' ')} failed`);
  };
  const ctx: Context = { baseBranch, git, params, rev };
  const owed = (step: Failure): Promise<WorkflowRunResult> => {
    return finalizeHandoffOwed({
      cwd,
      detail: step.detail,
      executeGraphqlV2: params.executeGraphqlV2,
      onChunk: params.onChunk,
      owedStep: step.owedStep,
      planId: params.planId,
    });
  };

  const prepared = await prepareSquash(ctx);

  if (!prepared.ok) {
    return owed(prepared);
  }

  const squashed = await squashRange(ctx, prepared.value);

  if (!squashed.ok) {
    return owed(squashed);
  }

  if (squashed.value !== undefined && !prepared.value.remoteExists) {
    const rebased = await rebaseOntoBase(ctx, prepared.value, squashed.value);

    if (!rebased.ok) {
      return owed(rebased);
    }
  }

  return finalizePlanRun({
    baseBranch,
    cwd,
    draftDir: params.draftDir,
    executeGraphqlV2: params.executeGraphqlV2,
    markReady: false,
    onChunk: params.onChunk,
    planId: params.planId,
    priorReason: FINALIZE_PRIOR_REASONS[params.outcome],
    runCommand,
  });
};
