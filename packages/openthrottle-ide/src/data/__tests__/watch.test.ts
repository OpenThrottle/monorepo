import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WatchEvent, WatchHandle, WorkspaceIndex } from '../watch.ts';
import { createWorkspaceIndex, watchWorkspace } from '../watch.ts';
import type { SnapshotDiff } from '../workspace.ts';

/** Seed content for `src/a.ts`, restored after the liveness probe below. */
const SEED_A = 'export const a = 1;\n';

/** How often the helpers below re-check their predicate. */
const POLL_INTERVAL_MS = 20;

/**
 * Backstop for {@link waitFor}, not a wait: every predicate here is gated on a
 * real watcher event, so the passing path settles as soon as that event lands
 * and never spends this budget. Sized against the workspace's 15000ms per-test
 * ceiling rather than Vitest's old 5000ms default, which a loaded CI box tripped
 * at 5092ms while the test itself still had 10s of headroom.
 */
const WAIT_TIMEOUT_MS = 12_000;

/** How long a single probe write gets before {@link waitForLiveWatcher} retries. */
const PROBE_INTERVAL_MS = 500;

/** Give up after this many probe writes; a live watcher needs one or two. */
const MAX_PROBE_ATTEMPTS = 10;

/** Poll `predicate` for up to `timeoutMs`, reporting whether it ever held. */
function settles(
  predicate: () => boolean,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const start = Date.now();
    const tick = (): void => {
      if (predicate()) {
        resolvePromise(true);
      } else if (Date.now() - start > timeoutMs) {
        resolvePromise(false);
      } else {
        setTimeout(tick, POLL_INTERVAL_MS);
      }
    };
    tick();
  });
}

/** Settle once `predicate` holds; throw after {@link WAIT_TIMEOUT_MS}. */
async function waitFor(label: string, predicate: () => boolean): Promise<void> {
  if (await settles(predicate, WAIT_TIMEOUT_MS)) {
    return;
  }
  throw new Error(
    `waitFor: timed out after ${WAIT_TIMEOUT_MS}ms waiting for ${label}`,
  );
}

/**
 * Re-apply `stimulus` until the watcher reports it, proving the watcher is
 * delivering rather than merely scanned.
 *
 * `WatchHandle.ready` only means chokidar finished its initial walk. On macOS
 * the first change inside a freshly watched directory is still dropped every so
 * often: chokidar lists the directory as watched and raises no error, yet the
 * event never arrives. Measured on an idle machine against chokidar alone, with
 * no engine code in the path, 7 of 120 fresh watchers missed the first write —
 * and all 7 reported the very next one, none needing a third. The event is
 * dropped, not delayed, so a longer timeout can never recover it; re-applying
 * the change does.
 *
 * Probing in `start()` closes that window before any assertion depends on it,
 * so the stimuli in the tests below can stay single-shot: each is a first touch
 * of its own path, issued after a preceding wait has already settled.
 */
async function waitForLiveWatcher(
  stimulus: (attempt: number) => Promise<void>,
  observed: () => boolean,
  attempt = 1,
): Promise<void> {
  await stimulus(attempt);
  if (await settles(observed, PROBE_INTERVAL_MS)) {
    return;
  }
  if (attempt >= MAX_PROBE_ATTEMPTS) {
    throw new Error(
      `watcher reported nothing after ${attempt} probe writes; it is not live`,
    );
  }
  await waitForLiveWatcher(stimulus, observed, attempt + 1);
}

describe('watchWorkspace', () => {
  let root: string;
  let handle: WatchHandle | undefined;
  let events: WatchEvent[];

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ot-ide-watch-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await mkdir(join(root, 'dist'), { recursive: true });
    await writeFile(join(root, '.gitignore'), 'dist\nignored.txt\n');
    await writeFile(join(root, 'src', 'a.ts'), SEED_A);
    events = [];
  });

  afterEach(async () => {
    await handle?.close();
    handle = undefined;
    await rm(root, { force: true, recursive: true });
  });

  const start = async (debounceMs = 10): Promise<void> => {
    handle = watchWorkspace(
      { root },
      { debounceMs, onEvents: (batch) => events.push(...batch) },
    );
    await handle.ready;
    // `ready` is the initial scan, not proof of delivery — probe until the
    // watcher actually reports something. Rewriting a seeded file keeps the
    // tree the tests below expect: nothing is added or removed.
    await waitForLiveWatcher(
      (attempt) =>
        writeFile(join(root, 'src', 'a.ts'), `export const a = ${attempt};\n`),
      () => find('change', 'src/a.ts') !== undefined,
    );
    events.length = 0;
  };

  const find = (
    type: WatchEvent['type'],
    path: string,
  ): WatchEvent | undefined =>
    events.find((event) => event.type === type && event.path === path);

  it('emits add/change/unlink events with workspace-relative POSIX paths', async () => {
    await start();

    await writeFile(join(root, 'src', 'b.ts'), 'export const b = 2;\n');
    await waitFor('add src/b.ts', () => find('add', 'src/b.ts') !== undefined);

    await writeFile(join(root, 'src', 'b.ts'), 'export const b = 3;\n');
    await waitFor(
      'change src/b.ts',
      () => find('change', 'src/b.ts') !== undefined,
    );

    await rm(join(root, 'src', 'b.ts'));
    await waitFor(
      'unlink src/b.ts',
      () => find('unlink', 'src/b.ts') !== undefined,
    );
  });

  it('does not emit events for gitignored or excluded files', async () => {
    await start();

    await writeFile(join(root, 'dist', 'out.js'), 'compiled');
    await writeFile(join(root, 'ignored.txt'), 'nope');
    // A tracked write we can wait on, proving the watcher is live.
    await writeFile(join(root, 'src', 'c.ts'), 'export const c = 4;\n');
    await waitFor(
      'add src/c.ts (sentinel)',
      () => find('add', 'src/c.ts') !== undefined,
    );

    expect(events.some((event) => event.path.startsWith('dist/'))).toBe(false);
    expect(find('add', 'ignored.txt')).toBeUndefined();
  });

  it('stops emitting after close()', async () => {
    await start();

    await handle?.close();
    handle = undefined;
    events.length = 0;

    await writeFile(join(root, 'src', 'd.ts'), 'export const d = 5;\n');
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));

    expect(events).toEqual([]);
  });
});

describe('createWorkspaceIndex', () => {
  let root: string;
  let index: WorkspaceIndex | undefined;
  let deltas: SnapshotDiff[];

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ot-ide-index-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, '.gitignore'), 'dist\n');
    await writeFile(join(root, 'src', 'a.ts'), SEED_A);
    deltas = [];
  });

  afterEach(async () => {
    await index?.close();
    index = undefined;
    await rm(root, { force: true, recursive: true });
  });

  const hashOfA = (): string | undefined =>
    index?.getSnapshot().find((entry) => entry.path === 'src/a.ts')?.hash;

  const start = async (): Promise<void> => {
    index = await createWorkspaceIndex({ root }, { debounceMs: 10 });
    index.subscribe((delta) => deltas.push(delta));
    // Same liveness probe as watchWorkspace, observed through the snapshot.
    // Probing a seeded file leaves the snapshot's path set untouched, and
    // restoring its content leaves its hash untouched, so the tests below still
    // see exactly the workspace hashWorkspace seeded. Gating on the hash rather
    // than on a count of deltas keeps a late duplicate from settling the wait
    // before the restore has actually landed in the snapshot.
    const seeded = hashOfA();
    await waitForLiveWatcher(
      (attempt) =>
        writeFile(
          join(root, 'src', 'a.ts'),
          `export const probe = ${attempt};\n`,
        ),
      () => hashOfA() !== seeded,
    );
    // The restore is re-applied for the same reason the probe is, and one more:
    // it writes the path the probe just wrote, and two changes to one path in
    // quick succession can be coalesced by the platform into the single event
    // already consumed above. Rewriting identical content is harmless — the
    // wait is already satisfied if the restore did land.
    await waitForLiveWatcher(
      () => writeFile(join(root, 'src', 'a.ts'), SEED_A),
      () => hashOfA() === seeded,
    );
    deltas.length = 0;
  };

  const pathsIn = (key: keyof SnapshotDiff): string[] =>
    deltas.flatMap((delta) => delta[key]);

  it('seeds the snapshot from hashWorkspace', async () => {
    await start();

    const paths = index?.getSnapshot().map((entry) => entry.path) ?? [];
    expect(paths.sort()).toEqual(['.gitignore', 'src/a.ts']);
  });

  it('emits incremental deltas as files are added, changed, and removed', async () => {
    await start();

    await writeFile(join(root, 'src', 'b.ts'), 'export const b = 2;\n');
    await waitFor('added src/b.ts', () =>
      pathsIn('added').includes('src/b.ts'),
    );

    await writeFile(join(root, 'src', 'a.ts'), 'export const a = 99;\n');
    await waitFor('changed src/a.ts', () =>
      pathsIn('changed').includes('src/a.ts'),
    );

    await rm(join(root, 'src', 'b.ts'));
    await waitFor('removed src/b.ts', () =>
      pathsIn('removed').includes('src/b.ts'),
    );

    const snapshotPaths = index?.getSnapshot().map((entry) => entry.path) ?? [];
    expect(snapshotPaths.sort()).toEqual(['.gitignore', 'src/a.ts']);
  });

  it('does not emit a delta when content is rewritten identically', async () => {
    await start();

    await writeFile(join(root, 'src', 'a.ts'), SEED_A);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));

    expect(deltas).toEqual([]);
  });
});

describe('createWorkspaceIndex symlink escape with followSymlinks', () => {
  let outside: string;
  let root: string;
  let index: WorkspaceIndex | undefined;

  beforeEach(async () => {
    outside = await mkdtemp(join(tmpdir(), 'ot-ide-outside-'));
    root = await mkdtemp(join(tmpdir(), 'ot-ide-index-symlink-'));
    await writeFile(join(outside, 'secret.txt'), 'top secret');
    await writeFile(join(root, 'inside.ts'), 'export const ok = 1;\n');
    // A symlink that stays inside the tree by name but whose target escapes.
    await symlink(join(outside, 'secret.txt'), join(root, 'leak.txt'));
  });

  afterEach(async () => {
    await index?.close();
    index = undefined;
    await rm(root, { force: true, recursive: true });
    await rm(outside, { force: true, recursive: true });
  });

  it('does not seed the snapshot with an escaping symlink target', async () => {
    // The index seeds from hashWorkspace, which drops symlinks whose real
    // target resolves outside the root — so the leaked file never enters the
    // index even with followSymlinks enabled.
    index = await createWorkspaceIndex(
      { followSymlinks: true, root },
      { debounceMs: 10 },
    );

    const paths = index.getSnapshot().map((entry) => entry.path);

    expect(paths).toContain('inside.ts');
    expect(paths).not.toContain('leak.txt');
  });
});
