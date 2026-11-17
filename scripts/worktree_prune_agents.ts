#!/usr/bin/env node
/**
 * @description `pnpm worktree:prune-agents [--dry-run]` — removes per-checkout agent
 * registrations whose checkout no longer exists.
 *
 * Teardown unregisters a worktree from every agent (`scripts/utils/agent-checkout-registrations.ts`).
 * A worktree removed any other way (a bare `git worktree remove`, the plan-run reaper, `rm -rf`)
 * skips teardown and leaves its registrations behind. This asks every registry entry for its
 * orphans and unregisters each through the agent's own CLI, grouped by agent.
 *
 *   pnpm worktree:prune-agents             unregister every orphan
 *   pnpm worktree:prune-agents --dry-run   list them per agent, change nothing
 *
 * An agent whose CLI is missing, or that is opted out, is reported as skipped. Exits 1 only when an
 * agent's records could not be read or an unregister failed. `scripts/setup.ts` runs the same sweep
 * best-effort.
 *
 * Runs under bare Node (native type stripping) with node builtins and scripts/utils only.
 */
import { fileURLToPath } from 'node:url';

import {
  logAgentOrphanSweeps,
  pruneCheckoutAgentOrphans,
} from './utils/agent-checkout-registrations.ts';
import { hasFlag } from './utils/args.ts';
import { createLogger } from './utils/logger.ts';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const logger = createLogger();
  const dryRun = hasFlag('dry-run');
  const sweeps = pruneCheckoutAgentOrphans(process.cwd(), process.env, dryRun);

  if (sweeps.length === 0) {
    logger.fail('not inside a git checkout — nothing to sweep');
    process.exitCode = 1;
  } else if (logAgentOrphanSweeps(sweeps, logger)) {
    process.exitCode = 1;
  }
}
