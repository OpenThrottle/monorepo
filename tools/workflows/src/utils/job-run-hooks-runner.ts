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
} from '../types/job-run-lifecycle-hooks';
import {
  formatJobRunHookEntryLabel,
  resolveJobRunHookOnFailure,
} from '../types/job-run-lifecycle-hooks';
import { jobRunHookEntryToPromptSeed } from './job-run-lifecycle-hooks-validation';
import { resolveRalphPromptFromSeed } from './ralph-prompt-resolution';
import { shouldRunJobRunHook } from './job-run-lifecycle-hooks-validation';
import { resolveJobRunHookTimeoutSeconds } from './job-run-lifecycle-hooks-validation';

export interface JobRunHookIterationParams {
  readonly agentPrompt: string;
  readonly hookIndex: number;
  readonly timeoutMs: number;
  readonly signal?: AbortSignal;
}

export interface JobRunHookIterationResult {
  readonly ok: boolean;
  readonly output?: string;
  readonly errorMessage?: string;
  readonly cancelled?: boolean;
}

export interface ExecuteJobRunHooksPhaseDeps {
  readonly appendPlanOutput: (
    content: string,
    iteration: number | null,
  ) => Promise<void>;
  readonly runHookIteration: (
    params: JobRunHookIterationParams,
  ) => Promise<JobRunHookIterationResult>;
  readonly cwd: string;
}

export interface ExecuteJobRunHooksPhaseParams {
  readonly deps: ExecuteJobRunHooksPhaseDeps;
  readonly hooks: JobRunHooksConfig | undefined;
  readonly phase: JobRunHookPhase;
  readonly planContextBlock: string;
  readonly planId: string;
  readonly runKind: JobRunHookRunKind;
  readonly layer1Suffix: string;
  readonly mainRunStarted?: boolean;
  readonly mainRunSucceeded?: boolean;
  readonly signal?: AbortSignal;
}

export interface JobRunHookPhaseEntryResult {
  readonly entry: JobRunHookEntry;
  readonly ok: boolean;
  readonly onFailure: JobRunHookOnFailure;
  readonly blocked: boolean;
  readonly errorMessage?: string;
}

export interface ExecuteJobRunHooksPhaseResult {
  /** When true, a `before_run` hook with `on_failure: block` failed; skip the main run. */
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

  // FIXME: __OT_UPDATE__ Lets fix this one
  const seed: any = jobRunHookEntryToPromptSeed(entry);
  const resolved = resolveRalphPromptFromSeed(cwd, seed);

  return resolved.prompt;
};

/**
 * @description Full agent prompt for one hook iteration (layer-1 + injected plan context).
 */
export const buildJobRunHookAgentPrompt = (params: {
  readonly entry: JobRunHookEntry;
  readonly layer1Text: string;
  readonly planContextBlock: string;
  readonly planId: string;
  readonly layer1Suffix: string;
}): string => {
  const { entry, layer1Suffix, layer1Text, planContextBlock, planId } = params;
  const phaseLabel = entry.phase === 'before_run' ? 'before_run' : 'after_run';

  return (
    `${layer1Text}\n\n` +
    `${planContextBlock}\n\n` +
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

  if (phase === 'before_run' && onFailure === 'block') {
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
