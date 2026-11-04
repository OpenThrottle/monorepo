import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  AppendPlanOutputDocument,
  GetPlanDocument,
  GetTasksByPlanIdDocument,
} from '../__generated__/graphql.ts';
import type {
  WorkflowExecuteGraphqlV2,
  WorkflowRalphCommandResult,
  WorkflowRalphCommandRunner,
  WorkflowRalphIterationOnChunk,
} from '../contract/ralph-orchestrator-deps.ts';
import type { WorkflowFinishedReason, WorkflowRunResult } from '../types.ts';
import type { PlanRunPrPlan, PlanRunPrTask } from './plan-run-pr-body.ts';
import {
  buildPlanRunPrBody,
  buildPlanRunPrFooter,
  classifyPlanRunPrBody,
  parseOnelineLog,
  parseTaskIdTrailers,
  PR_TEMPLATE_FALLBACK,
  resolvePlanRunPrTitle,
  selectFooterTaskIds,
} from './plan-run-pr-body.ts';
import {
  PLAN_RUN_PR_DRAFT_DIR_NAME,
  PLAN_RUN_PR_DRAFT_FILES,
  validatePlanRunPrDraft,
} from './plan-run-pr-draft.ts';
import { sortTasksByPlanListOrder } from './plan-task-list-order.ts';

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
  /**
   * @description Where the agent wrote its PR draft (`OT_PR_DRAFT_DIR`). `undefined` resolves the
   * skill default, `<absolute git dir>/ot-pr-draft`.
   */
  readonly draftDir: string | undefined;
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
 * @description The ref the branch is compared against. Fetches `origin/<base>` first because a
 * stale local base widens `<base>..HEAD` with commits that already landed. Falls back to the local
 * base when the remote ref can't be resolved (offline host, no `origin`).
 */
const resolveBaseRef = async (params: {
  readonly baseBranch: string;
  readonly cwd: string;
  readonly runCommand: WorkflowRalphCommandRunner;
}): Promise<string> => {
  const { baseBranch, cwd, runCommand } = params;
  // Best-effort: a failed fetch still leaves whatever origin/<base> the host already has.
  await runGit(runCommand, cwd, ['fetch', 'origin', baseBranch]);
  const remote = await runGit(runCommand, cwd, [
    'rev-parse',
    '--verify',
    '--quiet',
    `refs/remotes/origin/${baseBranch}`,
  ]);

  return remote.exitCode === 0 && remote.stdout.trim() !== ''
    ? `origin/${baseBranch}`
    : baseBranch;
};

const toOptionalText = (
  value: string | null | undefined,
): string | undefined =>
  value === null || value === undefined || value.trim() === ''
    ? undefined
    : value;

/**
 * @description Plan and task rows for the PR body. Best-effort: an unreachable OT yields
 * `undefined`, and the body falls back to git alone rather than failing finalize.
 */
const loadPlanAndTasks = async (params: {
  readonly executeGraphqlV2: WorkflowExecuteGraphqlV2;
  readonly planId: string;
}): Promise<{
  readonly plan: PlanRunPrPlan | undefined;
  readonly tasks: readonly PlanRunPrTask[] | undefined;
}> => {
  const { executeGraphqlV2, planId } = params;
  const [planResult, tasksResult] = await Promise.allSettled([
    executeGraphqlV2(GetPlanDocument, { id: planId }),
    executeGraphqlV2(GetTasksByPlanIdDocument, { input: { planId } }),
  ]);

  const planRow =
    planResult.status === 'fulfilled'
      ? (planResult.value.plan ?? undefined)
      : undefined;
  const plan =
    planRow === undefined
      ? undefined
      : {
          description: toOptionalText(planRow.description),
          summary: toOptionalText(planRow.summary),
          title: planRow.title,
        };

  const tasks =
    tasksResult.status === 'fulfilled' &&
    Array.isArray(tasksResult.value.tasksByPlanId)
      ? sortTasksByPlanListOrder(tasksResult.value.tasksByPlanId).map(
          (task) => ({
            id: task.id,
            status: task.status,
            summary: toOptionalText(task.summary),
            title: task.title,
          }),
        )
      : undefined;

  return { plan, tasks };
};

const readPrTemplate = async (cwd: string): Promise<string> => {
  try {
    return await readFile(
      join(cwd, '.github', 'pull_request_template.md'),
      'utf8',
    );
  } catch {
    return PR_TEMPLATE_FALLBACK;
  }
};

/**
 * @description Deterministic host-written PR title and body: only the branch's own commits
 * (`<baseRef>..HEAD`), plan and task data from OT, and a `Plan-Id:` plus every delivered
 * `Task-Id:` footer. Never adds agent attribution. Also returns the bare footer block, which
 * replaces the trailer of an agent-written draft.
 */
const buildFallbackPr = async (params: {
  readonly baseRef: string;
  readonly cwd: string;
  readonly executeGraphqlV2: WorkflowExecuteGraphqlV2;
  readonly planId: string;
  readonly runCommand: WorkflowRalphCommandRunner;
}): Promise<{
  readonly body: string;
  readonly footer: string;
  readonly title: string;
}> => {
  const { baseRef, cwd, executeGraphqlV2, planId, runCommand } = params;
  const range = `${baseRef}..HEAD`;

  const [template, log, rangeBodies, baseTrailers, ot] = await Promise.all([
    readPrTemplate(cwd),
    runGit(runCommand, cwd, ['log', '--oneline', '--no-decorate', range]),
    runGit(runCommand, cwd, ['log', '--format=%b', range]),
    runGit(runCommand, cwd, [
      'log',
      baseRef,
      '--grep=^Task-Id:',
      '--format=%b',
    ]),
    loadPlanAndTasks({ executeGraphqlV2, planId }),
  ]);

  const commits = log.exitCode === 0 ? parseOnelineLog(log.stdout) : [];
  const footerTaskIds = selectFooterTaskIds({
    rangeTaskIds:
      rangeBodies.exitCode === 0 ? parseTaskIdTrailers(rangeBodies.stdout) : [],
    taskIdsOnBase: new Set(
      baseTrailers.exitCode === 0
        ? parseTaskIdTrailers(baseTrailers.stdout)
        : [],
    ),
    tasks: ot.tasks,
  });

  return {
    body: buildPlanRunPrBody({
      commits,
      footerTaskIds,
      plan: ot.plan,
      planId,
      tasks: ot.tasks ?? [],
      template,
    }),
    footer: buildPlanRunPrFooter({ footerTaskIds, planId }),
    title: resolvePlanRunPrTitle({ commits, plan: ot.plan, planId }),
  };
};

/**
 * @description Best-effort plan_output + onChunk note from the finalize step. Never throws.
 */
const appendFinalizeNote = async (params: {
  readonly content: string;
  readonly executeGraphqlV2: WorkflowExecuteGraphqlV2;
  readonly onChunk: WorkflowRalphIterationOnChunk | undefined;
  readonly planId: string;
}): Promise<void> => {
  const { content, executeGraphqlV2, onChunk, planId } = params;

  try {
    await executeGraphqlV2(AppendPlanOutputDocument, {
      input: { content, planId },
    });
  } catch {
    // best-effort
  }

  if (onChunk) {
    try {
      await onChunk({ data: content, stream: 'stderr' });
    } catch {
      // ignore
    }
  }
};

/**
 * @description The draft directory the agent writes to: `<absolute git dir>/ot-pr-draft`, the
 * github-pull-request skill's own default. `undefined` when `cwd` isn't a git checkout.
 * @public
 */
export const resolvePlanRunPrDraftDir = async (params: {
  readonly cwd: string;
  readonly runCommand: WorkflowRalphCommandRunner;
}): Promise<string | undefined> => {
  const { cwd, runCommand } = params;

  try {
    const gitDir = await runGit(runCommand, cwd, [
      'rev-parse',
      '--absolute-git-dir',
    ]);
    const trimmed = gitDir.exitCode === 0 ? gitDir.stdout.trim() : '';

    return trimmed === ''
      ? undefined
      : join(trimmed, PLAN_RUN_PR_DRAFT_DIR_NAME);
  } catch {
    return undefined;
  }
};

/**
 * @description Run-start step: resolves the draft directory and deletes a draft left by an earlier
 * run, so finalize can never publish text that predates this run's commits. Never throws.
 * @public
 */
export const preparePlanRunPrDraftDir = async (params: {
  readonly cwd: string;
  readonly runCommand: WorkflowRalphCommandRunner;
}): Promise<string | undefined> => {
  const draftDir = await resolvePlanRunPrDraftDir(params);

  if (draftDir === undefined) {
    return undefined;
  }

  await Promise.all(
    Object.values(PLAN_RUN_PR_DRAFT_FILES).map(async (name) => {
      try {
        await rm(join(draftDir, name), { force: true });
      } catch {
        // A stale draft that can't be removed is still caught by finalize's validation.
      }
    }),
  );

  return draftDir;
};

const readOptionalFile = async (path: string): Promise<string | undefined> => {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return undefined;
  }
};

/**
 * @description The title and body to publish: the agent's draft when it exists and validates
 * (with the host footer and markers applied), otherwise the deterministic fallback. Logs which
 * source was used and why to plan_output.
 */
const resolvePrContent = async (params: {
  readonly baseRef: string;
  readonly cwd: string;
  readonly draftDir: string | undefined;
  readonly executeGraphqlV2: WorkflowExecuteGraphqlV2;
  readonly onChunk: WorkflowRalphIterationOnChunk | undefined;
  readonly planId: string;
  readonly runCommand: WorkflowRalphCommandRunner;
}): Promise<{ readonly body: string; readonly title: string }> => {
  const { draftDir, executeGraphqlV2, onChunk, planId } = params;
  const draftDirPath = draftDir ?? (await resolvePlanRunPrDraftDir(params));
  const [fallback, draftTitle, draftBody] = await Promise.all([
    buildFallbackPr(params),
    draftDirPath === undefined
      ? Promise.resolve(undefined)
      : readOptionalFile(join(draftDirPath, PLAN_RUN_PR_DRAFT_FILES.title)),
    draftDirPath === undefined
      ? Promise.resolve(undefined)
      : readOptionalFile(join(draftDirPath, PLAN_RUN_PR_DRAFT_FILES.body)),
  ]);

  const validation =
    draftTitle === undefined || draftBody === undefined
      ? undefined
      : validatePlanRunPrDraft({
          body: draftBody,
          footer: fallback.footer,
          title: draftTitle,
        });

  const reason =
    validation === undefined
      ? `no agent draft in ${draftDirPath ?? '(no git dir)'}`
      : validation.ok
        ? undefined
        : `agent draft rejected: ${validation.reason}`;

  await appendFinalizeNote({
    content:
      reason === undefined
        ? `[ralph-orchestrator] finalize: PR body source=agent-draft (${draftDirPath ?? ''})\n`
        : `[ralph-orchestrator] finalize: PR body source=fallback — ${reason}\n`,
    executeGraphqlV2,
    onChunk,
    planId,
  });

  return validation?.ok === true
    ? { body: validation.body, title: validation.title }
    : { body: fallback.body, title: fallback.title };
};

interface PrStepFailure {
  readonly detail: string;
  readonly ok: false;
  readonly owedStep: string;
}

const commandDetail = (
  result: WorkflowRalphCommandResult,
  fallback: string,
): string => result.stderr.trim() || result.stdout.trim() || fallback;

/**
 * @description Writes the title and body to a temp dir and runs `check-pr-attribution.sh` on them.
 */
const writeAndGuardPrFiles = async (params: {
  readonly body: string;
  readonly cwd: string;
  readonly runCommand: WorkflowRalphCommandRunner;
  readonly title: string;
}): Promise<
  | { readonly bodyPath: string; readonly ok: true; readonly titlePath: string }
  | PrStepFailure
> => {
  const { body, cwd, runCommand, title } = params;

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
      detail: commandDetail(attribution, 'attribution check failed'),
      ok: false,
      owedStep: 'pr-attribution',
    };
  }

  return { bodyPath, ok: true, titlePath };
};

/**
 * @description Reads an existing PR's body. `undefined` when it can't be read, which the caller
 * treats as "not ours to touch".
 */
const readPrBody = async (params: {
  readonly cwd: string;
  readonly prNumber: number;
  readonly runCommand: WorkflowRalphCommandRunner;
}): Promise<string | undefined> => {
  const { cwd, prNumber, runCommand } = params;
  const viewed = await runGh(runCommand, cwd, [
    'pr',
    'view',
    String(prNumber),
    '--json',
    'body',
    '--jq',
    '.body',
  ]);

  return viewed.exitCode === 0 ? viewed.stdout : undefined;
};

/**
 * @description Refreshes an existing PR's title and body when the current body is empty or an
 * untouched host body; leaves a human-edited body alone. Uses `gh pr edit`, falling back to the
 * REST API (per the github-pull-request skill) when `gh pr edit` fails.
 */
const refreshExistingPr = async (params: {
  readonly baseRef: string;
  readonly cwd: string;
  readonly draftDir: string | undefined;
  readonly executeGraphqlV2: WorkflowExecuteGraphqlV2;
  readonly onChunk: WorkflowRalphIterationOnChunk | undefined;
  readonly planId: string;
  readonly prNumber: number;
  readonly runCommand: WorkflowRalphCommandRunner;
}): Promise<{ readonly ok: true } | PrStepFailure> => {
  const { cwd, executeGraphqlV2, onChunk, planId, prNumber, runCommand } =
    params;
  const current = await readPrBody({ cwd, prNumber, runCommand });
  const owner =
    current === undefined ? undefined : classifyPlanRunPrBody(current);

  if (owner === undefined || owner === 'edited') {
    await appendFinalizeNote({
      content:
        owner === undefined
          ? `[ralph-orchestrator] finalize: could not read PR #${prNumber} body; left it unchanged\n`
          : `[ralph-orchestrator] finalize: PR #${prNumber} body was edited by a human; left it unchanged\n`,
      executeGraphqlV2,
      onChunk,
      planId,
    });

    return { ok: true };
  }

  const { body, title } = await resolvePrContent(params);
  const guarded = await writeAndGuardPrFiles({ body, cwd, runCommand, title });

  if (!guarded.ok) {
    return guarded;
  }

  const edited = await runGh(runCommand, cwd, [
    'pr',
    'edit',
    String(prNumber),
    '--title',
    title,
    '--body-file',
    guarded.bodyPath,
  ]);

  if (edited.exitCode === 0) {
    return { ok: true };
  }

  const patched = await runGh(runCommand, cwd, [
    'api',
    '--method',
    'PATCH',
    `repos/{owner}/{repo}/pulls/${prNumber}`,
    '-f',
    `title=${title}`,
    '-F',
    `body=@${guarded.bodyPath}`,
  ]);

  return patched.exitCode === 0
    ? { ok: true }
    : {
        detail: `${commandDetail(edited, 'gh pr edit failed')}; REST fallback: ${commandDetail(patched, 'gh api PATCH failed')}`,
        ok: false,
        owedStep: 'pr-edit',
      };
};

/**
 * @description Creates a draft PR after the local attribution guard passes, then marks it ready.
 */
const createAndReadyPr = async (params: {
  readonly baseRef: string;
  readonly cwd: string;
  readonly draftDir: string | undefined;
  readonly executeGraphqlV2: WorkflowExecuteGraphqlV2;
  readonly onChunk: WorkflowRalphIterationOnChunk | undefined;
  readonly planId: string;
  readonly runCommand: WorkflowRalphCommandRunner;
}): Promise<
  { readonly ok: true; readonly prNumber: number } | PrStepFailure
> => {
  const { cwd, runCommand } = params;
  const { body, title } = await resolvePrContent(params);
  const guarded = await writeAndGuardPrFiles({ body, cwd, runCommand, title });

  if (!guarded.ok) {
    return guarded;
  }

  const created = await runGh(runCommand, cwd, [
    'pr',
    'create',
    '--draft',
    '--title',
    title,
    '--body-file',
    guarded.bodyPath,
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
    draftDir,
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

  const baseRef = await resolveBaseRef({ baseBranch, cwd, runCommand });
  const ahead = await runGit(runCommand, cwd, [
    'rev-list',
    '--count',
    `${baseRef}..HEAD`,
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
    const refreshed = await refreshExistingPr({
      baseRef,
      cwd,
      draftDir,
      executeGraphqlV2,
      onChunk,
      planId,
      prNumber: existingPr,
      runCommand,
    });

    if (!refreshed.ok) {
      return handoffOwed({
        cwd,
        detail: refreshed.detail,
        executeGraphqlV2,
        onChunk,
        owedStep: refreshed.owedStep,
        planId,
      });
    }

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
    baseRef,
    cwd,
    draftDir,
    executeGraphqlV2,
    onChunk,
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
