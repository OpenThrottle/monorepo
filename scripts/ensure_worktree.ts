/**
 * @description Lazy self-heal guard for git worktrees.
 *
 * git has no post-`worktree add` hook, so a plain `git worktree add` (a human
 * at the terminal, CI, another agent, a future editor) creates a worktree
 * that never runs setup_worktree — leaving it with no .env, canonical
 * 6020-6025 ports, and placeholder service-account tokens. Creation-time
 * wiring can't catch that. This guard catches it on first USE instead: it
 * runs before `dev` (wired via nx.json targetDefaults.dev.dependsOn ->
 * monorepo:ensure-worktree) and, when it finds an unprovisioned linked
 * worktree, provisions it once.
 *
 * It is a no-op in the primary checkout and on already-provisioned worktrees.
 * (By the time this runs, nx itself is running, so node_modules exists — tsx
 * is safe here, unlike in the create/setup bootstrap path.)
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { gitOutput, isLinkedWorktree, primaryCheckoutDir } from './lib/git.ts';

/**
 * Decide whether a worktree needs provisioning from its markers. Both files
 * are .gitignored, so a fresh `git worktree add` has neither; when both exist
 * the worktree is provisioned. Exported for tests.
 */
export const needsProvisioning = (
  hasEnvFile: boolean,
  hasPortsPin: boolean,
): boolean => !(hasEnvFile && hasPortsPin);

const main = (): void => {
  // 1. Only ever act inside a LINKED worktree — the primary checkout and
  //    anything ambiguous are a no-op.
  if (!isLinkedWorktree()) {
    return;
  }

  const root = gitOutput(['rev-parse', '--show-toplevel']);

  if (root === undefined) {
    return;
  }

  // 2. Fast-path: already provisioned? setup_worktree writes both a root .env
  //    and a .worktree-ports pin. setup_worktree is itself idempotent, so
  //    re-running is safe; this early exit keeps the common case cheap.
  if (
    !needsProvisioning(
      existsSync(join(root, '.env')),
      existsSync(join(root, '.worktree-ports')),
    )
  ) {
    // prettier-ignore
    return;
  }

  // 3. Unprovisioned linked worktree → provision it once. stdin is closed so
  //    any prompt takes its default. OT_SOURCE_REPO points setup at the
  //    primary checkout so real service-account tokens are copied in.
  const sourceRepo = primaryCheckoutDir() ?? '';

  process.stderr.write(`🌳 self-heal: worktree '${root}' is unprovisioned — running setup_worktree\n`); // prettier-ignore

  const outcome = spawnSync('./scripts/setup_worktree.sh', [], {
    cwd: root,
    env: { ...process.env, OT_SOURCE_REPO: sourceRepo },
    stdio: ['ignore', 2, 2],
  });

  if (outcome.status !== 0 || outcome.error) {
    process.stderr.write('🔴 self-heal provisioning failed\n');
    process.exit(1);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
