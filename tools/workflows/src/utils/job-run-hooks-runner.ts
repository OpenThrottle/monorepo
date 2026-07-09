/**
 * @description Executes job-run lifecycle hooks for a single phase (`before_run` / `after_run`).
 * Hosts inject iteration execution and plan-output persistence (see openthrottle-server executor).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  JobRunHookEntry,
  JobRunHookOnFailure,
  JobRunHookPhase,
  JobRunHookRunKind,
  JobRunHooksConfig,
  JobRunHookTaskContext,
  JobRunHookTaskOutcome,
} from '../types/job-run-lifecycle-hooks';
import {
  formatJobRunHookEntryLabel,
  resolveJobRunHookOnFailure,
} from '../types/job-run-lifecycle-hooks';
import { DEFAULT_RALPH_RUNNER } from './ralph-execution-backend';
import { jobRunHookEntryToPromptSeed } from './job-run-lifecycle-hooks-validation';
import { resolveRalphPromptFromSeed } from './ralph-prompt-resolution';
import { shouldRunJobRunHook } from './job-run-lifecycle-hooks-validation';
import { resolveJobRunHookTimeoutSeconds } from './job-run-lifecycle-hooks-validation';
import {
  DEFAULT_RALPH_ITERATIONS,
  DEFAULT_RALPH_MODEL,
  type RalphRuntimeSeed,
} from './ralph-runtime-config';

export interface JobRunHookIterationParams {
  readonly agentPrompt: string;
  readonly hookIndex: number;
  readonly signal?: AbortSignal;
  readonly timeoutMs: number;
}

export interface JobRunHookIterationResult {
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
  readonly runHookIteration: (
    params: JobRunHookIterationParams,
  ) => Promise<JobRunHookIterationResult>;
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
  // `RalphRuntimeSeed` is irrelevant here, so we fill it with neutral
  // defaults rather than reading the main run's `.workflow-ralph.json`/env.
  const seed: RalphRuntimeSeed = {
    backend: DEFAULT_RALPH_RUNNER,
    iterationTimeoutMs: undefined,
    iterations: DEFAULT_RALPH_ITERATIONS,
    model: DEFAULT_RALPH_MODEL,
    project: undefined,
    prompt: promptSeed.prompt,
    promptFile: promptSeed.promptFile,
    skipWorktreeSetup: undefined,
    taskIterations: undefined,
    worktree: undefined,
    worktreeBase: undefined,
  };
  const resolved = resolveRalphPromptFromSeed(cwd, seed);

  return resolved.prompt;
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

  const taskBlock =
    task !== undefined
      ? `\n\nTask context:\n- id: ${task.id}\n- title: ${task.title}\n- status: ${task.status}${
          task.category !== undefined ? `\n- category: ${task.category}` : ''
        }${taskOutcome !== undefined ? `\n- outcome: ${taskOutcome}` : ''}\n`
      : '';

  return (
    `${layer1Text}\n\n` +
    `${planContextBlock}${taskBlock}\n\n` +
    `Plan-Id: ${planId}. ` +
    `This is a job-run lifecycle hook (${phaseLabel}). ${layer1Suffix}`
  );
};

const hookFailed = (result: JobRunHookIterationResult): boolean =>
  result.cancelled === true ||
  !result.ok ||
  (result.errorMessage !== undefined && result.errorMessage.trim() !== '');

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

    // eslint-disable-next-line no-await-in-loop
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

    // eslint-disable-next-line no-await-in-loop
    const iterationResult = await params.deps.runHookIteration({
      agentPrompt,
      hookIndex,
      signal: params.signal,
      timeoutMs,
    });

    hookIndex += 1;

    const failed = hookFailed(iterationResult);
    const policy = applyHookFailurePolicy(params.phase, onFailure, failed);

    if (iterationResult.output?.trim()) {
      // eslint-disable-next-line no-await-in-loop
      await params.deps.appendPlanOutput(
        `${iterationResult.output.trim()}\n`,
        null,
      );
    }

    if (failed) {
      const errLine =
        iterationResult.errorMessage ??
        (iterationResult.cancelled
          ? 'Hook iteration cancelled'
          : 'Hook iteration failed');
      // eslint-disable-next-line no-await-in-loop
      await params.deps.appendPlanOutput(
        `[job-run-hook] ${label} failed: ${errLine} (on_failure=${onFailure})\n`,
        null,
      );
    } else {
      // eslint-disable-next-line no-await-in-loop
      await params.deps.appendPlanOutput(
        `[job-run-hook] Finished ${label}\n`,
        null,
      );
    }

    results.push({
      blocked: policy.blocked,
      entry,
      errorMessage: failed ? iterationResult.errorMessage : undefined,
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
