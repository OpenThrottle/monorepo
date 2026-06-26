import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SnapshotDiff } from '../workspace.ts';
import type { WatchEvent, WatchHandle, WorkspaceIndex } from '../watch.ts';
import { createWorkspaceIndex, watchWorkspace } from '../watch.ts';

/** Poll until `predicate` is true or the timeout elapses. */
function waitFor(
  predicate: () => boolean,
  { interval = 20, timeout = 5000 } = {},
): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const start = Date.now();
    const tick = (): void => {
      if (predicate()) {
        resolvePromise();
      } else if (Date.now() - start > timeout) {
        rejectPromise(new Error('waitFor: timed out'));
      } else {
        setTimeout(tick, interval);
      }
    };
    tick();
  });
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
    await writeFile(join(root, 'src', 'a.ts'), 'export const a = 1;\n');
    events = [];
  });

  afterEach(async () => {
    await handle?.close();
    handle = undefined;
    await rm(root, { force: true, recursive: true });
  });

  const start = (debounceMs = 10): void => {
    handle = watchWorkspace(
      { root },
      { debounceMs, onEvents: (batch) => events.push(...batch) },
    );
  };

  const find = (
    type: WatchEvent['type'],
    path: string,
  ): WatchEvent | undefined =>
    events.find((event) => event.type === type && event.path === path);

  it('emits add/change/unlink events with workspace-relative POSIX paths', async () => {
    start();
    // Give the watcher a moment to finish its initial (ignored) scan.
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));

    await writeFile(join(root, 'src', 'b.ts'), 'export const b = 2;\n');
    await waitFor(() => find('add', 'src/b.ts') !== undefined);

    await writeFile(join(root, 'src', 'b.ts'), 'export const b = 3;\n');
    await waitFor(() => find('change', 'src/b.ts') !== undefined);

    await rm(join(root, 'src', 'b.ts'));
    await waitFor(() => find('unlink', 'src/b.ts') !== undefined);
  });

  it('does not emit events for gitignored or excluded files', async () => {
    start();
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));

    await writeFile(join(root, 'dist', 'out.js'), 'compiled');
    await writeFile(join(root, 'ignored.txt'), 'nope');
    // A tracked write we can wait on, proving the watcher is live.
    await writeFile(join(root, 'src', 'c.ts'), 'export const c = 4;\n');
    await waitFor(() => find('add', 'src/c.ts') !== undefined);

    expect(events.some((event) => event.path.startsWith('dist/'))).toBe(false);
    expect(find('add', 'ignored.txt')).toBeUndefined();
  });

  it('stops emitting after close()', async () => {
    start();
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));

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
    await writeFile(join(root, 'src', 'a.ts'), 'export const a = 1;\n');
    deltas = [];
  });

  afterEach(async () => {
    await index?.close();
    index = undefined;
    await rm(root, { force: true, recursive: true });
  });

  const start = async (): Promise<void> => {
    index = await createWorkspaceIndex({ root }, { debounceMs: 10 });
    index.subscribe((delta) => deltas.push(delta));
    // Let the watcher's initial (ignored) scan settle before mutating.
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
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
    await waitFor(() => pathsIn('added').includes('src/b.ts'));

    await writeFile(join(root, 'src', 'a.ts'), 'export const a = 99;\n');
    await waitFor(() => pathsIn('changed').includes('src/a.ts'));

    await rm(join(root, 'src', 'b.ts'));
    await waitFor(() => pathsIn('removed').includes('src/b.ts'));

    const snapshotPaths = index?.getSnapshot().map((entry) => entry.path) ?? [];
    expect(snapshotPaths.sort()).toEqual(['.gitignore', 'src/a.ts']);
  });

  it('does not emit a delta when content is rewritten identically', async () => {
    await start();

    await writeFile(join(root, 'src', 'a.ts'), 'export const a = 1;\n');
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
