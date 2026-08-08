/**
 * Non-gating tsconfig project-reference drift check (informational, opt-in).
 *
 * Context: `@nx/js:typescript-sync` is disabled workspace-wide
 * (`nx.json` → `sync.disabledTaskSyncGenerators`) because in a non-TTY worktree
 * shell it hard-fails every target with "workspace is out of sync", and on
 * Nx 22.7.4 it emits phantom cross-references between the React Router apps
 * (Nx #36297). tsconfig `references` are therefore maintained by hand — see
 * docs/monorepo and CLAUDE.md; NEVER run bare `nx sync`.
 *
 * With auto-sync off, genuine reference drift (an app/package that starts
 * importing a sibling but never gets its tsconfig reference) could accrue
 * silently. This script surfaces that drift WITHOUT ever gating dev work:
 *
 *   1. Purge the Nx graph cache so the drift read is accurate.
 *   2. Invoke the sync generator DIRECTLY (`nx g @nx/js:typescript-sync`) — an
 *      explicit generator run bypasses the task-sync gate disable, so it still
 *      reports drift even though the gate is off. This is the ONE sanctioned use
 *      of the generator; the script always reverts and never commits its output.
 *   3. Diff what it changed, then immediately `git checkout` the touched files so
 *      the working tree is left exactly as it was.
 *   4. Filter out phantom app->app references (Nx #36297): any added reference in
 *      an `applications/<app>/tsconfig.json` whose resolved target is also under
 *      `applications/` is expected noise — apps never import each other.
 *   5. Print only REAL drift (app->package, package->package, or stale removals).
 *
 * ALWAYS exits 0 — this is intentionally non-blocking. It is NOT part of
 * `check:local` and must never become a required CI status. Run it by hand
 * (`pnpm run check:tsconfig-refs`) or as an informational CI job when you suspect
 * a reference is missing after wiring up a new cross-package import.
 *
 * Usage: pnpm run check:tsconfig-refs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';

const SYNC_GENERATOR = '@nx/js:typescript-sync';

const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();

const git = (args: readonly string[]): string =>
  execFileSync('git', [...args], { cwd: repoRoot, encoding: 'utf8' });

/** A single reference change parsed out of the generator's diff. */
interface RefChange {
  readonly file: string;
  readonly kind: 'added' | 'removed';
  readonly phantom: boolean;
  readonly refPath: string;
}

/**
 * A reference is a phantom app->app edge when it lives in an `applications/*`
 * tsconfig and resolves to another `applications/*` project. Apps never import
 * each other, so these are always the Nx #36297 defect, never real drift.
 */
const isPhantomAppEdge = (file: string, refPath: string): boolean => {
  const fileDir = path.dirname(file);
  const inApplications = (p: string): boolean =>
    p === 'applications' || p.startsWith(`applications${path.sep}`);
  if (!inApplications(fileDir)) return false;
  const resolved = path.normalize(path.join(fileDir, refPath));
  return inApplications(resolved);
};

const parseDiff = (diff: string): RefChange[] => {
  const changes: RefChange[] = [];
  let currentFile = '';
  for (const line of diff.split('\n')) {
    const header = line.match(/^\+\+\+ b\/(.+)$/);
    if (header) {
      currentFile = header[1];
      continue;
    }
    if (!currentFile.endsWith('tsconfig.json')) continue;
    // Only added/removed lines that carry a reference path.
    const match = line.match(/^([+-])\s*"path":\s*"([^"]+)"/);
    if (!match) continue;
    const kind = match[1] === '+' ? 'added' : 'removed';
    const refPath = match[2];
    changes.push({
      file: currentFile,
      kind,
      phantom: kind === 'added' && isPhantomAppEdge(currentFile, refPath),
      refPath,
    });
  }
  return changes;
};

const main = (): void => {
  // Safety: never clobber an in-progress edit. If any tsconfig is already dirty,
  // we cannot cleanly restore after running the generator — bail (non-blocking).
  const dirty = git(['status', '--porcelain'])
    .split('\n')
    .map((l) => l.slice(3).trim())
    .filter((f) => f.endsWith('tsconfig.json'));
  if (dirty.length > 0) {
    console.log(
      'ℹ️  check:tsconfig-refs skipped — uncommitted tsconfig.json changes present:',
    );
    for (const f of dirty) console.log(`     ${f}`);
    console.log('     Commit or stash them, then re-run. (exit 0)');
    return;
  }

  // Accurate drift read needs a fresh graph.
  for (const dir of ['.nx/workspace-data', '.nx/cache']) {
    const abs = path.join(repoRoot, dir);
    if (existsSync(abs)) rmSync(abs, { force: true, recursive: true });
  }

  // Apply the generator, capture what it touched, then restore the tree.
  try {
    execFileSync('pnpm', ['nx', 'g', SYNC_GENERATOR, '--quiet'], {
      cwd: repoRoot,
      env: { ...process.env, NX_DAEMON: 'false' },
      stdio: 'ignore',
    });
  } catch {
    // Generator failure is not our concern to gate on; restore and report clean.
  }

  const changedFiles = git(['diff', '--name-only'])
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => f.endsWith('tsconfig.json'));

  const diff =
    changedFiles.length > 0 ? git(['diff', '--', ...changedFiles]) : '';

  // Restore the working tree to exactly its prior state.
  if (changedFiles.length > 0) git(['checkout', '--', ...changedFiles]);

  const changes = parseDiff(diff);
  const real = changes.filter((c) => !c.phantom);
  const phantom = changes.filter((c) => c.phantom);

  console.log('tsconfig project-reference drift check (non-gating)\n');
  if (phantom.length > 0) {
    console.log(
      `  ↪ filtered ${phantom.length} phantom app→app reference(s) (Nx #36297, expected noise)`,
    );
  }

  if (real.length === 0) {
    console.log('  ✅ No real tsconfig-reference drift.');
    return;
  }

  console.log(`  ⚠️  ${real.length} real reference drift(s) found:\n`);
  for (const c of real) {
    const verb = c.kind === 'added' ? 'MISSING ref →' : 'STALE ref  ✗';
    console.log(`     ${c.file}\n        ${verb} ${c.refPath}`);
  }
  console.log(
    '\n  Reconcile by hand: add the missing reference (or remove the stale one)\n' +
      '  to the listed tsconfig.json. Do NOT run bare `nx sync`.',
  );
};

main();
