import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { AppendPlanOutputDocument } from '../__generated__/graphql.ts';
import type {
  WorkflowExecuteGraphqlV2,
  WorkflowRalphCommandRunner,
  WorkflowRalphIterationOnChunk,
} from '../contract/ralph-orchestrator-deps.ts';
import type { WorkflowFinishedReason, WorkflowRunResult } from '../types.ts';

/** Finished reasons that trigger the host-owned push + PR finalize step. */
const FINALIZE_REASONS = [
  'workflow_complete',
  'workflow_complete_handoff_owed',
  'workflow_tasks_exhausted',
] as const;

type FinalizePriorReason = (typeof FINALIZE_REASONS)[number];

const isFinalizePriorReason = (reason: string): reason is FinalizePriorReason =>
  FINALIZE_REASONS.some((candidate) => candidate === reason);

export interface FinalizePlanRunParams {
  readonly baseBranch: string;
  readonly cwd: string;
  readonly executeGraphqlV2: WorkflowExecuteGraphqlV2;
  readonly onChunk: WorkflowRalphIterationOnChunk | undefined;
  readonly planId: string;
  readonly priorReason: FinalizePriorReason;
  readonly runCommand: WorkflowRalphCommandRunner;
}

const finished = (params: {
  readonly headSha: string | undefined;
  readonly prNumber: number | undefined;
  readonly reason: Exclude<WorkflowFinishedReason, 'workflow_usage_limited'>;
}): WorkflowRunResult => {
  const base = {
    exitCode: 0 as const,
    reason: params.reason,
    status: 'finished' as const,
  };

  if (params.headSha !== undefined && params.prNumber !== undefined) {
    return {
      ...base,
      headSha: params.headSha,
      prNumber: params.prNumber,
    };
  }

  if (params.headSha !== undefined) {
    return { ...base, headSha: params.headSha };
  }

  if (params.prNumber !== undefined) {
    return { ...base, prNumber: params.prNumber };
  }

  return base;
};

const runGit = async (
  runCommand: WorkflowRalphCommandRunner,
  cwd: string,
  args: readonly string[],
) => runCommand({ args, command: 'git', cwd });

const runGh = async (
  runCommand: WorkflowRalphCommandRunner,
  cwd: string,
  args: readonly string[],
) => runCommand({ args, command: 'gh', cwd });

/**
 * @description Best-effort plan_output diagnostic naming the owed finalize step. Never throws.
 */
const appendHandoffDiagnostic = async (params: {
  readonly cwd: string;
  readonly detail: string;
  readonly executeGraphqlV2: WorkflowExecuteGraphqlV2;
  readonly onChunk: WorkflowRalphIterationOnChunk | undefined;
  readonly owedStep: string;
  readonly planId: string;
}): Promise<void> => {
  const { cwd, detail, executeGraphqlV2, onChunk, owedStep, planId } = params;
  const content = `[ralph-orchestrator] finalize handoff owed: step=${owedStep} cwd=${cwd} — ${detail}\n`;

  try {
    await executeGraphqlV2(AppendPlanOutputDocument, {
      input: { content, planId },
    });
  } catch {
    // Plan output is best-effort; fall through to onChunk.
  }

  if (onChunk) {
    try {
      await onChunk({ data: content, stream: 'stderr' });
    } catch {
      // Diagnostics must never mask the handoff outcome.
    }
  }
};

const handoffOwed = async (params: {
  readonly cwd: string;
  readonly detail: string;
  readonly executeGraphqlV2: WorkflowExecuteGraphqlV2;
  readonly onChunk: WorkflowRalphIterationOnChunk | undefined;
  readonly owedStep: string;
  readonly planId: string;
}): Promise<WorkflowRunResult> => {
  await appendHandoffDiagnostic(params);

  return finished({
    headSha: undefined,
    prNumber: undefined,
    reason: 'workflow_complete_handoff_owed',
  });
};

const parsePositiveInt = (raw: string): number | undefined => {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return undefined;
  }
  const value = Number.parseInt(trimmed, 10);
  return Number.isInteger(value) && value > 0 ? value : undefined;
};

/**
 * @description Looks up an existing open PR for `branch` via `gh pr list --head`.
 */
const findExistingPrNumber = async (params: {
  readonly branch: string;
  readonly cwd: string;
  readonly runCommand: WorkflowRalphCommandRunner;
}): Promise<number | undefined> => {
  const { branch, cwd, runCommand } = params;
  const listed = await runGh(runCommand, cwd, [
    'pr',
    'list',
    '--head',
    branch,
    '--json',
    'number',
    '--limit',
    '1',
  ]);

  if (listed.exitCode !== 0) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(listed.stdout);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return undefined;
    }
    const first: unknown = parsed[0];
    if (
      first !== null &&
      typeof first === 'object' &&
      'number' in first &&
      typeof first.number === 'number' &&
      Number.isInteger(first.number) &&
      first.number > 0
    ) {
      return first.number;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

/**
 * @description Builds a conventional-commit PR title from the branch tip subject, falling back to a
 * plan-scoped default when git log is empty.
 */
const resolvePrTitle = async (params: {
  readonly cwd: string;
  readonly planId: string;
  readonly runCommand: WorkflowRalphCommandRunner;
}): Promise<string> => {
  const { cwd, planId, runCommand } = params;
  const tip = await runGit(runCommand, cwd, ['log', '-1', '--format=%s']);
  const subject = tip.exitCode === 0 ? tip.stdout.trim() : '';

  if (subject !== '') {
    return subject;
  }

  return `chore: complete plan ${planId.slice(0, 8)}`;
};

/**
 * @description Fills `.github/pull_request_template.md` with a short summary and Plan-Id footer.
 * Never adds agent attribution.
 */
const buildPrBody = async (params: {
  readonly cwd: string;
  readonly planId: string;
  readonly runCommand: WorkflowRalphCommandRunner;
}): Promise<string> => {
  const { cwd, planId, runCommand } = params;
  const templatePath = join(cwd, '.github', 'pull_request_template.md');
  let template: string;

  try {
    template = await readFile(templatePath, 'utf8');
  } catch {
    template =
      '# Summary\n\n**TODO:** Describe the changes in this PR.\n\n## Testing\n\n- [ ] Pipelines should be passing\n';
  }

  const log = await runGit(runCommand, cwd, [
    'log',
    '--oneline',
    '--no-decorate',
    '-20',
  ]);
  const summaryLines =
    log.exitCode === 0 && log.stdout.trim() !== ''
      ? log.stdout
          .trim()
          .split('\n')
          .map((line) => `- ${line.trim()}`)
          .join('\n')
      : '- Plan run completed; see commits on this branch.';

  const withSummary = template.includes(
    '**TODO:** Describe the changes in this PR.',
  )
    ? template.replace(
        '**TODO:** Describe the changes in this PR.',
        summaryLines,
      )
    : `${template.trimEnd()}\n\n## Summary\n\n${summaryLines}\n`;

  return `${withSummary.trimEnd()}\n\nPlan-Id: ${planId}\n`;
};

/**
 * @description Creates a draft PR after the local attribution guard passes, then marks it ready.
 */
const createAndReadyPr = async (params: {
  readonly cwd: string;
  readonly planId: string;
  readonly runCommand: WorkflowRalphCommandRunner;
}): Promise<
  | { readonly ok: true; readonly prNumber: number }
  | { readonly detail: string; readonly ok: false; readonly owedStep: string }
> => {
  const { cwd, planId, runCommand } = params;
  const title = await resolvePrTitle({ cwd, planId, runCommand });
  const body = await buildPrBody({ cwd, planId, runCommand });

  let tempDir: string;
  try {
    tempDir = await mkdtemp(join(tmpdir(), 'ralph-finalize-pr-'));
  } catch (error) {
    return {
      detail: error instanceof Error ? error.message : String(error),
      ok: false,
      owedStep: 'pr-temp-dir',
    };
  }

  const titlePath = join(tempDir, 'title.txt');
  const bodyPath = join(tempDir, 'body.md');

  try {
    await writeFile(titlePath, title, 'utf8');
    await writeFile(bodyPath, body, 'utf8');
  } catch (error) {
    return {
      detail: error instanceof Error ? error.message : String(error),
      ok: false,
      owedStep: 'pr-write-draft',
    };
  }

  const attribution = await runCommand({
    args: [
      join(cwd, 'scripts', 'check-pr-attribution.sh'),
      '--title-file',
      titlePath,
      '--body-file',
      bodyPath,
    ],
    command: 'bash',
    cwd,
  });

  if (attribution.exitCode !== 0) {
    return {
      detail:
        attribution.stderr.trim() ||
        attribution.stdout.trim() ||
        'attribution check failed',
      ok: false,
      owedStep: 'pr-attribution',
    };
  }

  const created = await runGh(runCommand, cwd, [
    'pr',
    'create',
    '--draft',
    '--title',
    title,
    '--body-file',
    bodyPath,
  ]);

  if (created.exitCode !== 0) {
    return {
      detail:
        created.stderr.trim() || created.stdout.trim() || 'gh pr create failed',
      ok: false,
      owedStep: 'pr-create',
    };
  }

  // `gh pr create` prints the URL; resolve the number from the current branch.
  const viewed = await runGh(runCommand, cwd, [
    'pr',
    'view',
    '--json',
    'number',
    '--jq',
    '.number',
  ]);
  const prNumber =
    viewed.exitCode === 0 ? parsePositiveInt(viewed.stdout) : undefined;

  if (prNumber === undefined) {
    return {
      detail:
        viewed.stderr.trim() ||
        viewed.stdout.trim() ||
        'could not resolve new PR number',
      ok: false,
      owedStep: 'pr-create',
    };
  }

  const ready = await runGh(runCommand, cwd, ['pr', 'ready', String(prNumber)]);

  if (ready.exitCode !== 0) {
    return {
      detail:
        ready.stderr.trim() || ready.stdout.trim() || 'gh pr ready failed',
      ok: false,
      owedStep: 'pr-ready',
    };
  }

  return { ok: true, prNumber };
};

/**
 * @description Host-owned plan-end finalize: push the worktree branch (through Husky, never
 * `--no-verify`), find or create a PR, mark it ready, and return settle artifacts (`headSha` +
 * `prNumber`). Runs only after {@link FinalizePriorReason}. Failures never FAIL the run — they
 * return `workflow_complete_handoff_owed` and write a plan_output chunk naming the owed step.
 *
 * Credentials are the worker host's existing `git` / `gh` auth. A non-host (docker) worker
 * without those credentials fails into handoff-owed the same way a push denial does — the agent
 * container is not asked to push; only the host finalize step is.
 *
 * @public
 */
export const finalizePlanRun = async (
  params: FinalizePlanRunParams,
): Promise<WorkflowRunResult> => {
  const {
    baseBranch,
    cwd,
    executeGraphqlV2,
    onChunk,
    planId,
    priorReason,
    runCommand,
  } = params;

  const branchResult = await runGit(runCommand, cwd, [
    'rev-parse',
    '--abbrev-ref',
    'HEAD',
  ]);
  const branch = branchResult.exitCode === 0 ? branchResult.stdout.trim() : '';

  if (branch === '' || branch === 'HEAD') {
    return handoffOwed({
      cwd,
      detail: branchResult.stderr.trim() || 'could not resolve current branch',
      executeGraphqlV2,
      onChunk,
      owedStep: 'resolve-branch',
      planId,
    });
  }

  const ahead = await runGit(runCommand, cwd, [
    'rev-list',
    '--count',
    `${baseBranch}..HEAD`,
  ]);

  if (ahead.exitCode !== 0) {
    return handoffOwed({
      cwd,
      detail: ahead.stderr.trim() || `could not compare to ${baseBranch}`,
      executeGraphqlV2,
      onChunk,
      owedStep: 'commits-ahead',
      planId,
    });
  }

  const aheadCount = Number.parseInt(ahead.stdout.trim(), 10);

  if (!Number.isFinite(aheadCount) || aheadCount <= 0) {
    const skipMessage = `[ralph-orchestrator] finalize: no commits ahead of ${baseBranch} on ${branch}; skipping push and PR\n`;
    try {
      await executeGraphqlV2(AppendPlanOutputDocument, {
        input: { content: skipMessage, planId },
      });
    } catch {
      // best-effort
    }
    if (onChunk) {
      try {
        await onChunk({ data: skipMessage, stream: 'stderr' });
      } catch {
        // ignore
      }
    }

    return finished({
      headSha: undefined,
      prNumber: undefined,
      reason: priorReason,
    });
  }

  const pushed = await runGit(runCommand, cwd, [
    'push',
    '-u',
    'origin',
    branch,
  ]);

  if (pushed.exitCode !== 0) {
    return handoffOwed({
      cwd,
      detail: pushed.stderr.trim() || pushed.stdout.trim() || 'git push failed',
      executeGraphqlV2,
      onChunk,
      owedStep: 'git-push',
      planId,
    });
  }

  const head = await runGit(runCommand, cwd, ['rev-parse', 'HEAD']);
  const headSha =
    head.exitCode === 0 && head.stdout.trim() !== ''
      ? head.stdout.trim()
      : undefined;

  if (headSha === undefined) {
    return handoffOwed({
      cwd,
      detail: head.stderr.trim() || 'could not resolve HEAD sha after push',
      executeGraphqlV2,
      onChunk,
      owedStep: 'head-sha',
      planId,
    });
  }

  const existingPr = await findExistingPrNumber({
    branch,
    cwd,
    runCommand,
  });

  if (existingPr !== undefined) {
    const ready = await runGh(runCommand, cwd, [
      'pr',
      'ready',
      String(existingPr),
    ]);

    // Already-ready PRs make `gh pr ready` exit non-zero; treat that as success when the PR exists.
    if (
      ready.exitCode !== 0 &&
      !/already ready|not a draft/i.test(`${ready.stderr}\n${ready.stdout}`)
    ) {
      return handoffOwed({
        cwd,
        detail:
          ready.stderr.trim() || ready.stdout.trim() || 'gh pr ready failed',
        executeGraphqlV2,
        onChunk,
        owedStep: 'pr-ready',
        planId,
      });
    }

    return finished({
      headSha,
      prNumber: existingPr,
      reason:
        priorReason === 'workflow_complete_handoff_owed'
          ? 'workflow_complete'
          : priorReason,
    });
  }

  const created = await createAndReadyPr({
    cwd,
    planId,
    runCommand,
  });

  if (!created.ok) {
    return handoffOwed({
      cwd,
      detail: created.detail,
      executeGraphqlV2,
      onChunk,
      owedStep: created.owedStep,
      planId,
    });
  }

  return finished({
    headSha,
    prNumber: created.prNumber,
    reason:
      priorReason === 'workflow_complete_handoff_owed'
        ? 'workflow_complete'
        : priorReason,
  });
};

/**
 * @description Whether a finished reason should run the host push/PR finalize step.
 * @public
 */
export const shouldFinalizePlanRun = (
  reason: string,
): reason is FinalizePriorReason => isFinalizePriorReason(reason);
