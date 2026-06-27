/**
 * @description Shared SIGTERM→SIGKILL escalation for spawned children, used by both the Ralph
 * child-job runner ({@link file://./child-job.ts}) and the per-iteration shell runner
 * ({@link file://../bin/run-iteration.ts}). These two spawn/kill paths were near-identical and
 * each carried their own copy of the grace period and escalation logic, so a fix to one (e.g.
 * the grace duration) could silently miss the other. Centralizing the constant and the escalation
 * keeps them from diverging.
 */

import type { ChildProcess } from 'child_process';

/** Grace period in ms after SIGTERM before sending SIGKILL to a spawned child. */
export const SIGKILL_GRACE_MS = 10_000;

/**
 * @description Sends SIGTERM to the child, then SIGKILL after {@link SIGKILL_GRACE_MS} if it has
 * not exited. The SIGKILL timer is cleared when the child closes. Safe to call when the child has
 * already been killed (no-op). The SIGKILL send is wrapped in try/catch because the process may
 * exit between the timer firing and the signal landing.
 */
export function escalateKill(child: ChildProcess): void {
  if (child.killed) return;
  child.kill('SIGTERM');

  const killTimeout = setTimeout(() => {
    try {
      child.kill('SIGKILL');
    } catch {
      /* process may have exited */
    }
  }, SIGKILL_GRACE_MS);

  child.once('close', () => clearTimeout(killTimeout));
}
