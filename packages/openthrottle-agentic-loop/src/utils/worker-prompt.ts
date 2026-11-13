import type { AttemptFailure, LoopTask } from '../contract/index.ts';
import {
  FAILURE_TAIL_MAX_BYTES,
  FAILURE_TAIL_MAX_LINES,
} from '../data/data.constants.ts';
import {
  WORKER_PROMPT_HARD_RULES,
  WORKER_PROMPT_INTRO,
  WORKER_PROMPT_REPOSITORY_RULES,
  WORKER_PROMPT_RESULT_INSTRUCTIONS,
} from '../data/data.worker-prompt.ts';
import { stripAnsi } from './command-output.ts';

/** @public */
export interface BuildWorkerPromptInput {
  /** Run-scoped operator guidance, oldest first. */
  readonly guidance: readonly string[];
  readonly previousFailure: AttemptFailure | undefined;
  readonly task: LoopTask;
}

const failureSection = (failure: AttemptFailure): string => {
  if (failure.kind === 'validation') {
    const tail = tailForRetry(failure.tail);
    const count = tail.length === 0 ? 0 : tail.split('\n').length;

    return [
      `# Previous attempt failed validation`,
      `Command: ${failure.command}`,
      `Exit code: ${failure.exitCode}`,
      `Last ${count} lines of output:`,
      tail,
    ].join('\n');
  }

  if (failure.kind === 'commit') {
    return [
      `# Previous attempt failed to commit`,
      `The caller's commit step was rejected. Fix the cause (do not commit yourself). Output:`,
      tailForRetry(failure.output),
    ].join('\n');
  }

  return [`# Previous attempt failed`, failure.message].join('\n');
};

/**
 * @description The worker prompt (docs/workflows/ot-loop-job.md § 3), built from the task row,
 * operator guidance and the previous attempt's failure. Pure; no slash command, MCP or tool
 * specific instructions.
 * @public
 */
export const buildWorkerPrompt = (input: BuildWorkerPromptInput): string => {
  const { guidance, previousFailure, task } = input;
  const sections: string[] = [
    WORKER_PROMPT_INTRO,
    `# Task\n${task.title}\n\n${task.description}`,
  ];

  if (task.requirements.length > 0) {
    const items = task.requirements.map((entry) => `- ${entry}`);

    sections.push(`# Acceptance criteria\n${items.join('\n')}`);
  }

  if (guidance.length > 0) {
    sections.push(`# Operator guidance\n${guidance.join('\n\n')}`);
  }

  if (previousFailure !== undefined) {
    sections.push(failureSection(previousFailure));
  }

  sections.push(
    WORKER_PROMPT_REPOSITORY_RULES,
    WORKER_PROMPT_HARD_RULES,
    WORKER_PROMPT_RESULT_INSTRUCTIONS,
  );

  return `${sections.join('\n\n')}\n`;
};

/**
 * @description Defensive read of a task row's `requirementsJson`: a string holding a JSON array of
 * strings yields its non-blank entries; anything else yields no criteria.
 * @public
 */
export const parseRequirements = (value: unknown): readonly string[] => {
  if (typeof value !== 'string') {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry): entry is string =>
        typeof entry === 'string' && entry.trim().length > 0,
    );
  } catch {
    return [];
  }
};

const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);

/**
 * @description Failure tail for a retry prompt (§ 6): ANSI stripped, last 200 lines, capped at 16 KB.
 * @public
 */
export const tailForRetry = (output: string): string => {
  const clean = stripAnsi(output);
  const lines = clean.split('\n').slice(-FAILURE_TAIL_MAX_LINES);
  const joined = lines.join('\n');
  const bytes = Buffer.from(joined, 'utf8');

  if (bytes.length <= FAILURE_TAIL_MAX_BYTES) {
    return joined;
  }

  const kept = bytes
    .subarray(bytes.length - FAILURE_TAIL_MAX_BYTES)
    .toString('utf8');

  return kept.startsWith(REPLACEMENT_CHAR) ? kept.slice(1) : kept;
};
