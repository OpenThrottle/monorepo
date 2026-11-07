/**
 * Claude Code plan-run task guard (PreToolUse hook, matcher
 * `Edit|Write|MultiEdit|NotebookEdit`).
 *
 * During a plan run (a `register_plan_run` with no later `settle_plan_run` in
 * the session transcript), warns via `additionalContext` when an edit is about
 * to happen while no task is IN_PROGRESS. It never denies. The decision and
 * the bounded transcript read live in `./plan-run-task-guard-output.ts`.
 *
 * Every path, including any internal failure or an unreadable transcript,
 * prints nothing: the note is a courtesy, never a gate.
 */
import fs from 'node:fs';

import { logHookError } from '../../index.ts';
import { decideClaudePlanRunTaskGuard } from './plan-run-task-guard-output.ts';

const main = (): void => {
  try {
    const stdinBuf = fs.readFileSync(0, 'utf8');
    if (!stdinBuf || !stdinBuf.trim()) return;

    let raw: unknown;
    try {
      raw = JSON.parse(stdinBuf);
    } catch (err) {
      logHookError('plan-run-task-guard: invalid JSON stdin', err);
      return;
    }

    const output = decideClaudePlanRunTaskGuard(raw);
    if (output !== null) process.stdout.write(output);
  } catch (err) {
    logHookError('plan-run-task-guard failed', err);
  }
};

try {
  main();
} finally {
  process.exit(0);
}
