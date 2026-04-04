import { resolve } from 'node:path';
import { COLORS } from '../config/index';
import { MESSAGE_OUTRO } from '../config/messages';
import { showNxUsage, showRalphUsage } from '../utils/index';
import type { RalphDebugLevel } from './ralph-debug-logger';
import {
  ralphDebugLogger,
  readRalphDebugConfigFromEnv,
  setRalphDebugLevel,
} from './ralph-debug-logger';
import type { RalphExecutionBackendId } from './ralph-execution-backend';
import {
  parseRalphExecutionBackendId,
  DEFAULT_RALPH_RUNNER,
} from './ralph-execution-backend';
import {
  mergeRalphRuntimeSeed,
  DEFAULT_RALPH_ITERATIONS,
  DEFAULT_RALPH_PROMPT,
} from './ralph-runtime-config';
import {
  readRalphPromptFileUtf8,
  readRalphPromptStdinUtf8,
  resolveRalphPromptFromSeed,
  type RalphPromptProfileKind,
} from './ralph-prompt-resolution';

/** RFC 4122 UUID v4 pattern: plan/task is Cortex plan or task ID when matching */
const CORTEX_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Matches <ralph:complete-task>uuid</ralph:complete-task>; Ralph marks those tasks completed via Postgres. */
const RALPH_COMPLETE_TASK_REGEX =
  /<ralph:complete-task>([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})<\/ralph:complete-task>/gi;

const RALPH_COMPLETE_TASK_OPEN = '<ralph:complete-task>' as const;
const RALPH_COMPLETE_TASK_CLOSE = '</ralph:complete-task>' as const;

const PROMISE_ERROR = '<promise>ERROR</promise>' as const;
const PROMISE_COMPLETE = '<promise>COMPLETE</promise>' as const;
const PROMISE_INPUT_REQUIRED = '<promise>INPUT_REQUIRED</promise>' as const;

/**
 * @description Snapshot of delimiter / terminal markers in agent output (for shim debug; single pass over {@link result}).
 */
export const getRalphOutputMarkerFlags = (
  result: string,
): {
  readonly hasCompleteTaskClose: boolean;
  readonly hasCompleteTaskOpen: boolean;
  readonly hasPromiseComplete: boolean;
  readonly hasPromiseError: boolean;
  readonly hasPromiseInputRequired: boolean;
} => ({
  hasCompleteTaskClose: result.includes(RALPH_COMPLETE_TASK_CLOSE),
  hasCompleteTaskOpen: result.includes(RALPH_COMPLETE_TASK_OPEN),
  hasPromiseComplete: result.includes(PROMISE_COMPLETE),
  hasPromiseError: result.includes(PROMISE_ERROR),
  hasPromiseInputRequired: result.includes(PROMISE_INPUT_REQUIRED),
});

export const isCortexPlanId = (plan: string): boolean =>
  CORTEX_UUID_REGEX.test(plan.trim());

export const isCortexTaskId = (task: string): boolean =>
  CORTEX_UUID_REGEX.test(task.trim());

/**
 * @description Parses agent result for <ralph:complete-task>uuid</ralph:complete-task>. Returns unique task IDs; Ralph marks them completed via Postgres.
 */
export const parseRalphCompleteTaskSignals = (result: string): string[] => {
  const ids: string[] = [];
  let m: RegExpExecArray | null;

  RALPH_COMPLETE_TASK_REGEX.lastIndex = 0;

  let regexExecCount = 0;
  while ((m = RALPH_COMPLETE_TASK_REGEX.exec(result)) !== null) {
    regexExecCount += 1;
    ids.push(m[1]!.toLowerCase());
  }
  const unique = [...new Set(ids)];
  const flags = getRalphOutputMarkerFlags(result);
  ralphDebugLogger.debug('parseRalphCompleteTaskSignals', {
    ...flags,
    matchesRaw: ids.length,
    regexExecCount,
    resultLen: result.length,
    uniqueTaskIds: unique.length,
  });
  if (flags.hasCompleteTaskOpen && unique.length === 0) {
    ralphDebugLogger.verbose(
      'parseRalphCompleteTaskSignals: open tag present but no valid complete-task UUID parsed',
      {
        hasCompleteTaskClose: flags.hasCompleteTaskClose,
        resultLen: result.length,
        tail: result.slice(-Math.min(240, result.length)),
      },
    );
  }
  return unique;
};

export interface NxArgs {
  project: string;
}

/**
 * @description Parses command-line arguments from process.argv
 */
export const parseNxArgs = (): NxArgs => {
  const args = process.argv.slice(2);
  const parsed: Partial<NxArgs> = {
    project: '',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // 🔍 If the user has requested help show the usage info and exit
    if (arg === '--help') {
      showNxUsage();
      process.exit(0);
    }

    if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}`);
    }
  }

  const result: NxArgs = {
    project: parsed.project ?? '',
  };
  return result;
};

export interface RalphArgs {
  /** @description Layer 2: which runner invokes each iteration (default: Cursor `cursor-agent`). */
  backend: RalphExecutionBackendId;
  /** Optional per-iteration timeout in ms (non-interactive only). When set, the runner process is killed after this duration. */
  iterationTimeoutMs: number | undefined;
  iterations: number;
  model: string | undefined;
  /** Cortex plan UUID. Required when not in task-centric mode; when --task is used without --plan, resolved from task.planId. */
  plan: string | undefined;
  /** Optional NX project name (from project graph). Validated against getNxProjectNames() when provided. */
  project: string | undefined;
  /** Effective layer-1 prompt text (named path, file body, or stdin body). */
  prompt: string;
  /** How {@link prompt} was resolved (named / file / stdin). */
  promptProfileKind: RalphPromptProfileKind;
  /** Short label for logs (command path, absolute file path, or `stdin`). */
  promptProfileLabel: string;
  /** Effective Ralph shim debug level after env + CLI (see {@link setRalphDebugLevel}). */
  ralphDebugLevel: RalphDebugLevel;
  /** When set, Ralph runs in task-centric mode (single task). Plan can be omitted and resolved from the task. */
  task: string | undefined;
}

/**
 * @description Parses command-line arguments from process.argv
 */
export const parseRalphArgs = (): RalphArgs => {
  const args = process.argv.slice(2);
  const cwd = process.cwd();
  const seed = mergeRalphRuntimeSeed(cwd);
  const parsed: Partial<RalphArgs> = {
    backend: seed.backend,
    iterationTimeoutMs: seed.iterationTimeoutMs,
    iterations: seed.iterations,
    model: seed.model,
    project: seed.project,
    prompt: seed.prompt,
    task: undefined,
  };

  /** CLI override for shim debug; `verbose` wins over `debug` if both appear. */
  let cliDebug: 'none' | 'debug' | 'verbose' = 'none';

  /** True when `--prompt` appeared on argv (not only from seed defaults). */
  let explicitNamedPrompt = false;
  let cliPromptFile: string | undefined;
  let cliPromptStdin = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // 🔍 If the user has requested help show the usage info and exit
    if (arg === '--help') {
      showRalphUsage();
      process.exit(0);
    }

    // 🔍 Handle all additional arguments
    if (arg === '--debug' || arg.startsWith('--debug=')) {
      if (arg.startsWith('--debug=')) {
        const value = arg.slice('--debug='.length).trim().toLowerCase();
        if (value === 'verbose' || value === '2' || value === 'all') {
          cliDebug = 'verbose';
        } else if (
          value === '' ||
          value === '1' ||
          value === 'true' ||
          value === 'on'
        ) {
          if (cliDebug !== 'verbose') {
            cliDebug = 'debug';
          }
        } else {
          const message = `--debug=value expects "verbose" or a truthy debug flag; got "${value}"`;
          throw new Error(message);
        }
      } else if (cliDebug !== 'verbose') {
        cliDebug = 'debug';
      }
    } else if (arg === '--verbose') {
      cliDebug = 'verbose';
    } else if (arg === '--iterations' && i + 1 < args.length) {
      const value = parseInt(args[i + 1] ?? '', 10);
      if (isNaN(value) || value < 1) {
        const message = `--iterations must be a positive integer greater than 0`;
        throw new Error(message);
      }

      parsed.iterations = value;
      i++;
    } else if (arg === '--plan') {
      if (i + 1 >= args.length) {
        const message = `🚨 ${COLORS.yellow}--plan${COLORS.reset} requires a Cortex plan UUID`;
        throw new Error(message);
      }

      parsed.plan = args[i + 1];
      i++;
    } else if (arg === '--task') {
      if (i + 1 >= args.length) {
        const message = `🚨 ${COLORS.yellow}--task${COLORS.reset} requires a Cortex task UUID`;
        throw new Error(message);
      }

      parsed.task = args[i + 1];
      i++;
    } else if (arg === '--prompt' && i + 1 < args.length) {
      parsed.prompt = args[i + 1];
      explicitNamedPrompt = true;
      i++;
    } else if (arg === '--prompt-file' && i + 1 < args.length) {
      cliPromptFile = args[i + 1];
      i++;
    } else if (arg === '--prompt-stdin') {
      cliPromptStdin = true;
    } else if (arg === '--iteration-timeout' && i + 1 < args.length) {
      const value = parseInt(args[i + 1] ?? '', 10);
      if (isNaN(value) || value < 1) {
        const message = `--iteration-timeout must be a positive integer (seconds)`;
        throw new Error(message);
      }
      parsed.iterationTimeoutMs = value * 1000;
      i++;
    } else if (arg === '--model' && i + 1 < args.length) {
      parsed.model = args[i + 1];
      i++;
    } else if (arg === '--project' && i + 1 < args.length) {
      parsed.project = args[i + 1];
      i++;
    } else if (arg === '--backend' && i + 1 < args.length) {
      parsed.backend = parseRalphExecutionBackendId(args[i + 1] ?? '', 'cli');
      i++;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}`);
    }
  }

  // When --task is present we run in task-centric mode; plan can be resolved from the task. Otherwise --plan is required.
  if (!parsed.task && !parsed.plan) {
    const message = `🚨 ${COLORS.yellow}--plan${COLORS.reset} is required (or use ${COLORS.yellow}--task${COLORS.reset} for task-centric mode)`;
    throw new Error(message);
  }

  if (parsed.plan && !isCortexPlanId(parsed.plan)) {
    const message = `🚨 Plan must be a Cortex plan UUID (v4). Example: ${COLORS.blue}77cb14a0-5eb0-4061-87ea-d618b85e8818${COLORS.reset}`;
    throw new Error(message);
  }

  if (parsed.task && !isCortexTaskId(parsed.task)) {
    const message = `🚨 Task must be a Cortex task UUID (v4). Example: ${COLORS.blue}45a30762-92a9-42f4-90e0-2437c7ef26a8${COLORS.reset}`;
    throw new Error(message);
  }

  /**
   * Layer 1 — prompt profile: explicit CLI flags override seed (CLI > env > file > built-in).
   * `--prompt-stdin` | `--prompt-file` | `--prompt` are mutually exclusive.
   */
  if (cliPromptStdin && cliPromptFile !== undefined) {
    throw new Error(
      `${COLORS.yellow}--prompt-stdin${COLORS.reset} cannot be combined with ${COLORS.yellow}--prompt-file${COLORS.reset}`,
    );
  }
  if (cliPromptStdin && explicitNamedPrompt) {
    throw new Error(
      `${COLORS.yellow}--prompt-stdin${COLORS.reset} cannot be combined with ${COLORS.yellow}--prompt${COLORS.reset}`,
    );
  }
  if (cliPromptFile !== undefined && explicitNamedPrompt) {
    throw new Error(
      `${COLORS.yellow}--prompt-file${COLORS.reset} cannot be combined with ${COLORS.yellow}--prompt${COLORS.reset}`,
    );
  }

  let resolvedPrompt: string;
  let promptProfileKind: RalphPromptProfileKind;
  let promptProfileLabel: string;

  if (cliPromptStdin) {
    if (process.stdin.isTTY === true) {
      throw new Error(
        `${COLORS.yellow}--prompt-stdin${COLORS.reset} requires piped stdin (not a TTY). Example: ${COLORS.blue}cat my-prompt.md | pnpm exec workflow-ralph --plan <uuid> --prompt-stdin${COLORS.reset}`,
      );
    }
    resolvedPrompt = readRalphPromptStdinUtf8();
    promptProfileKind = 'stdin';
    promptProfileLabel = 'stdin';
  } else if (cliPromptFile !== undefined) {
    const userPath = cliPromptFile.trim();
    if (userPath === '') {
      throw new Error(`--prompt-file requires a non-empty path`);
    }
    const absolute = resolve(cwd, userPath);
    resolvedPrompt = readRalphPromptFileUtf8(cwd, userPath);
    promptProfileKind = 'file';
    promptProfileLabel = absolute;
  } else if (explicitNamedPrompt) {
    const named = (parsed.prompt ?? DEFAULT_RALPH_PROMPT).trim();
    resolvedPrompt = named;
    promptProfileKind = 'named';
    promptProfileLabel = named;
  } else {
    const fromSeed = resolveRalphPromptFromSeed(cwd, seed);
    resolvedPrompt = fromSeed.prompt;
    promptProfileKind = fromSeed.promptProfileKind;
    promptProfileLabel = fromSeed.promptProfileLabel;
  }

  /**
   * CLI wins when any `--debug` / `--verbose` is present; otherwise use env
   * (same rules as {@link readRalphDebugConfigFromEnv}) so argv parsing is the single place that applies the effective level after import.
   */
  const effectiveDebugLevel: RalphDebugLevel =
    cliDebug === 'verbose'
      ? 'verbose'
      : cliDebug === 'debug'
        ? 'debug'
        : readRalphDebugConfigFromEnv();

  setRalphDebugLevel(effectiveDebugLevel);

  const result: RalphArgs = {
    backend: parsed.backend ?? DEFAULT_RALPH_RUNNER,
    iterationTimeoutMs: parsed.iterationTimeoutMs,
    iterations: parsed.iterations ?? DEFAULT_RALPH_ITERATIONS,
    model: parsed.model,
    plan: parsed.plan,
    project: parsed.project,
    prompt: resolvedPrompt,
    promptProfileKind,
    promptProfileLabel,
    ralphDebugLevel: ralphDebugLogger.level,
    task: parsed.task,
  };
  return result;
};

/**
 * @description Parses the results of an iteration and exits the process if necessary
 */
export const parseRalphResponse = (
  result: string,
  iteration: number,
  plan: string,
): void => {
  console.log(result);

  const markers = getRalphOutputMarkerFlags(result);
  const hasErr = markers.hasPromiseError;
  const needsInput = markers.hasPromiseInputRequired;
  const complete = markers.hasPromiseComplete;

  ralphDebugLogger.debug('parseRalphResponse: after output', {
    ...markers,
    hasErr,
    hasInputRequired: needsInput,
    isComplete: complete,
    iteration,
    parseOutcome:
      hasErr || needsInput || complete
        ? 'terminal_marker'
        : 'continue_next_iteration',
    plan,
    resultLen: result.length,
  });

  if (hasErr) {
    ralphDebugLogger.debug('parseRalphResponse: exiting (ERROR)', {
      iteration,
    });
    const msgError = `🚨 Error in iteration ${COLORS.yellow}${iteration}${COLORS.reset}`;

    console.error(msgError);
    process.exit(1);
  }

  if (needsInput) {
    ralphDebugLogger.debug('parseRalphResponse: exiting (INPUT_REQUIRED)', {
      iteration,
    });
    console.warn('⚠️ User input required, exiting...');
    process.exit(1);
  }

  if (complete) {
    ralphDebugLogger.debug('parseRalphResponse: exiting (COMPLETE)', {
      iteration,
    });
    console.debug(MESSAGE_OUTRO);
    console.log(`✅ "${plan}" is complete, exiting...`);
    process.exit(0);
  }

  ralphDebugLogger.debug(
    'parseRalphResponse: continue (no terminal promise marker)',
    {
      iteration,
      stillExpected:
        'one of <promise>ERROR</promise>, INPUT_REQUIRED, COMPLETE, or next iteration',
    },
  );
  ralphDebugLogger.verbose('parseRalphResponse: tail (no exit)', {
    iteration,
    resultLen: result.length,
    tail: result.slice(-Math.min(320, result.length)),
  });

  // 🔄 Continue to the next iteration
};
