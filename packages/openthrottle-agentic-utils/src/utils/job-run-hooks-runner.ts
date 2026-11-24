/**
 * @description Executes job-run lifecycle hooks for a single phase (`before_run` / `after_run`).
 * Hosts inject agent execution and plan-output persistence (see openthrottle-server executor).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  DEFAULT_PLAN_RUN_MODEL,
  DEFAULT_WORKFLOW_ITERATIONS,
  DEFAULT_WORKFLOW_RUNNER,
} from '../config/index.ts';
import type {
  JobRunHookEntry,
  JobRunHookOnFailure,
  JobRunHookPhase,
  JobRunHookRunKind,
  JobRunHooksConfig,
  JobRunHookTaskContext,
  JobRunHookTaskOutcome,
} from '../types/job-run-lifecycle-hooks.ts';
import {
  formatJobRunHookEntryLabel,
  resolveJobRunHookOnFailure,
} from '../types/job-run-lifecycle-hooks.ts';
import type { PlanRunRuntimeSeed } from '../types/plan-run-settings.ts';
import { jobRunHookEntryToPromptSeed } from './job-run-lifecycle-hooks-validation.ts';
import { shouldRunJobRunHook } from './job-run-lifecycle-hooks-validation.ts';
import { resolveJobRunHookTimeoutSeconds } from './job-run-lifecycle-hooks-validation.ts';
import { resolvePlanRunPromptFromSeed } from './plan-run-prompt-resolution.ts';

export interface JobRunHookAgentParams {
  readonly agentPrompt: string;
  readonly hookIndex: number;
  readonly signal?: AbortSignal;
  readonly timeoutMs: number;
}

export interface JobRunHookAgentResult {
  readonly cancelled?: boolean;
  readonly errorMessage?: string;
  readonly ok: boolean;
  readonly output?: string;
}

export interface ExecuteJobRunHooksPhaseDeps {
  readonly appendPlanOutput: (
    content: string,
    iteration: number | null,
  ) => Promise<void>;
  readonly cwd: string;
  readonly runHookAgent: (
    params: JobRunHookAgentParams,
  ) => Promise<JobRunHookAgentResult>;
}

export interface ExecuteJobRunHooksPhaseParams {
  readonly deps: ExecuteJobRunHooksPhaseDeps;
  readonly hooks: JobRunHooksConfig | undefined;
  readonly layer1Suffix: string;
  readonly mainRunStarted?: boolean;
  readonly mainRunSucceeded?: boolean;
  readonly phase: JobRunHookPhase;
  readonly planContextBlock: string;
  readonly planId: string;
  readonly runKind: JobRunHookRunKind;
  readonly signal?: AbortSignal;
  readonly task?: JobRunHookTaskContext;
  readonly taskOutcome?: JobRunHookTaskOutcome;
}

export interface JobRunHookPhaseEntryResult {
  readonly blocked: boolean;
  readonly entry: JobRunHookEntry;
  readonly errorMessage?: string;
  readonly ok: boolean;
  readonly onFailure: JobRunHookOnFailure;
}

export interface ExecuteJobRunHooksPhaseResult {
  /** When true, a blocking hook failed; meaning depends on phase (plan vs task scope). */
  readonly blocked: boolean;
  readonly results: readonly JobRunHookPhaseEntryResult[];
}

/**
 * @description Removes leading YAML frontmatter (`---` … `---`) from skill markdown.
 */
export const stripSkillMarkdownFrontmatter = (raw: string): string => {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith('---')) {
    return raw.trim();
  }

  const end = trimmed.indexOf('\n---', 3);
  if (end === -1) {
    return raw.trim();
  }

  return trimmed.slice(end + '\n---'.length).trimStart();
};

/**
 * @description Reads repo skill `SKILL.md` for hook layer-1 (filesystem read, not MCP).
 */
export const readJobRunHookSkillMarkdown = (
  cwd: string,
  skillPath: string,
): string => {
  const raw = readFileSync(resolve(cwd, skillPath), 'utf8');
  const body = stripSkillMarkdownFrontmatter(raw);

  return `# Repo skill: ${skillPath}\n\n${body}`;
};

/**
 * @description Resolves layer-1 prompt text for a hook (named/file profile or SKILL.md body).
 */
export const resolveJobRunHookLayer1Prompt = (
  entry: JobRunHookEntry,
  cwd: string,
): string => {
  if (entry.kind === 'skill') {
    return readJobRunHookSkillMarkdown(cwd, entry.skillPath);
  }

  const promptSeed = jobRunHookEntryToPromptSeed(entry);
  // Layer-1 hook prompts only ever resolve `prompt`/`promptFile`; the rest of
  // `PlanRunRuntimeSeed` is irrelevant here, so we fill it with neutral
  // defaults rather than reading the main run's repo config/env.
  const seed: PlanRunRuntimeSeed = {
    driver: DEFAULT_WORKFLOW_RUNNER,
    iterationTimeoutMs: undefined,
    iterations: DEFAULT_WORKFLOW_ITERATIONS,
    model: DEFAULT_PLAN_RUN_MODEL,
    project: undefined,
    prompt: promptSeed.prompt,
    promptFile: promptSeed.promptFile,
    skipWorktreeSetup: undefined,
    taskIterations: undefined,
    worktree: undefined,
    worktreeBase: undefined,
  };
  const resolved = resolvePlanRunPromptFromSeed(cwd, seed);

  return resolved.prompt;
};

const formatHookTaskBlock = (
  task: JobRunHookTaskContext | undefined,
  taskOutcome: JobRunHookTaskOutcome | undefined,
): string => {
  if (task === undefined) {
    return '';
  }

  const categoryLine =
    task.category !== undefined ? `\n- category: ${task.category}` : '';
  const outcomeLine =
    taskOutcome !== undefined ? `\n- outcome: ${taskOutcome}` : '';

  return `\n\nTask context:\n- id: ${task.id}\n- title: ${task.title}\n- status: ${task.status}${categoryLine}${outcomeLine}\n`;
};

/**
 * @description Full agent prompt for one hook iteration (layer-1 + injected plan context).
 */
export const buildJobRunHookAgentPrompt = (params: {
  readonly entry: JobRunHookEntry;
  readonly layer1Suffix: string;
  readonly layer1Text: string;
  readonly planContextBlock: string;
  readonly planId: string;
  readonly task?: JobRunHookTaskContext;
  readonly taskOutcome?: JobRunHookTaskOutcome;
}): string => {
  const {
    entry,
    layer1Suffix,
    layer1Text,
    planContextBlock,
    planId,
    task,
    taskOutcome,
  } = params;
  const phaseLabel = entry.phase;

  const taskBlock = formatHookTaskBlock(task, taskOutcome);

  return (
    `${layer1Text}\n\n` +
    `${planContextBlock}${taskBlock}\n\n` +
    `Plan-Id: ${planId}. ` +
    `This is a job-run lifecycle hook (${phaseLabel}). ${layer1Suffix}`
  );
};

const hookFailed = (result: JobRunHookAgentResult): boolean => {
  return (
    result.cancelled === true ||
    !result.ok ||
    (result.errorMessage !== undefined && result.errorMessage.trim() !== '')
  );
};

const applyHookFailurePolicy = (
  phase: JobRunHookPhase,
  onFailure: JobRunHookOnFailure,
  failed: boolean,
): { readonly blocked: boolean; readonly continuePhase: boolean } => {
  if (!failed) {
    return { blocked: false, continuePhase: true };
  }

  if (onFailure === 'ignore') {
    return { blocked: false, continuePhase: true };
  }

  if (onFailure === 'warn') {
    return { blocked: false, continuePhase: true };
  }

  if (
    (phase === 'beforeAll' || phase === 'beforeEach') &&
    onFailure === 'block'
  ) {
    return { blocked: true, continuePhase: false };
  }

  return { blocked: false, continuePhase: true };
};

/**
 * @description Runs all hooks for {@link ExecuteJobRunHooksPhaseParams.phase} in configured order.
 */
export const executeJobRunHooksPhase = async (
  params: ExecuteJobRunHooksPhaseParams,
): Promise<ExecuteJobRunHooksPhaseResult> => {
  const hooks = params.hooks?.hooks ?? [];

  if (hooks.length === 0) {
    return { blocked: false, results: [] };
  }

  const context = {
    mainRunStarted: params.mainRunStarted ?? true,
    mainRunSucceeded: params.mainRunSucceeded ?? false,
    phase: params.phase,
    runKind: params.runKind,
    ...(params.task !== undefined ? { task: params.task } : {}),
    ...(params.taskOutcome !== undefined
      ? { taskOutcome: params.taskOutcome }
      : {}),
  };

  const results: JobRunHookPhaseEntryResult[] = [];
  let blocked = false;
  let hookIndex = 0;

  for (const entry of hooks) {
    if (!shouldRunJobRunHook(entry, context)) {
      continue;
    }

    const onFailure = resolveJobRunHookOnFailure(entry);
    const label = formatJobRunHookEntryLabel(entry);

    // eslint-disable-next-line no-await-in-loop -- sequential by design: hooks run in order and output lines must stay ordered
    await params.deps.appendPlanOutput(
      `[job-run-hook] Starting ${label}\n`,
      null,
    );

    const layer1Text = resolveJobRunHookLayer1Prompt(entry, params.deps.cwd);
    const agentPrompt = buildJobRunHookAgentPrompt({
      entry,
      layer1Suffix: params.layer1Suffix,
      layer1Text,
      planContextBlock: params.planContextBlock,
      planId: params.planId,
      task: params.task,
      taskOutcome: params.taskOutcome,
    });

    const timeoutMs = resolveJobRunHookTimeoutSeconds(entry) * 1000;

    // eslint-disable-next-line no-await-in-loop -- sequential by design: each hook runs to completion before the next starts
    const agentResult = await params.deps.runHookAgent({
      agentPrompt,
      hookIndex,
      signal: params.signal,
      timeoutMs,
    });

    hookIndex += 1;

    const failed = hookFailed(agentResult);
    const policy = applyHookFailurePolicy(params.phase, onFailure, failed);

    if (agentResult.output?.trim()) {
      // eslint-disable-next-line no-await-in-loop -- sequential by design: output lines must stay in hook order
      await params.deps.appendPlanOutput(
        `${agentResult.output.trim()}\n`,
        null,
      );
    }

    if (failed) {
      const errLine =
        agentResult.errorMessage ??
        (agentResult.cancelled ? 'Hook agent cancelled' : 'Hook agent failed');
      // eslint-disable-next-line no-await-in-loop -- sequential by design: output lines must stay in hook order
      await params.deps.appendPlanOutput(
        `[job-run-hook] ${label} failed: ${errLine} (on_failure=${onFailure})\n`,
        null,
      );
    } else {
      // eslint-disable-next-line no-await-in-loop -- sequential by design: output lines must stay in hook order
      await params.deps.appendPlanOutput(
        `[job-run-hook] Finished ${label}\n`,
        null,
      );
    }

    results.push({
      blocked: policy.blocked,
      entry,
      errorMessage: failed ? agentResult.errorMessage : undefined,
      ok: !failed,
      onFailure,
    });

    if (policy.blocked) {
      blocked = true;
    }

    if (!policy.continuePhase) {
      break;
    }
  }

  return { blocked, results };
};
