import {
  appendFile,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WatchEvent, WatchHandle, WorkspaceIndex } from '../watch.ts';
import { createWorkspaceIndex, watchWorkspace } from '../watch.ts';
import type { SnapshotDiff } from '../workspace.ts';

/** Records batches and resolves waiters from the listener, never a clock. */
interface Recorder<TItem> {
  readonly items: TItem[];
  readonly push: (batch: readonly TItem[]) => void;
  readonly reset: () => void;
  readonly until: (
    predicate: (items: readonly TItem[]) => boolean,
  ) => Promise<void>;
}

interface Waiter<TItem> {
  readonly predicate: (items: readonly TItem[]) => boolean;
  readonly resolve: () => void;
}

function createRecorder<TItem>(): Recorder<TItem> {
  const items: TItem[] = [];
  let waiters: Waiter<TItem>[] = [];

  const settle = (): void => {
    waiters = waiters.filter((waiter) => {
      if (!waiter.predicate(items)) {
        return true;
      }
      waiter.resolve();
      return false;
    });
  };

  return {
    items,
    push: (batch) => {
      items.push(...batch);
      settle();
    },
    reset: () => {
      items.length = 0;
    },
    until: (predicate) => {
      return new Promise((resolvePromise) => {
        waiters.push({ predicate, resolve: resolvePromise });
        settle();
      });
    },
  };
}

interface ProbeSignals {
  /** The watcher's debounce window; rewrites are spaced wider than it. */
  readonly debounceMs: number;
  /** Resolves once the watcher has reported the probe file gone. */
  readonly gone: () => Promise<void>;
  /** Resolves once the watcher has reported the probe file existing. */
  readonly seen: () => Promise<void>;
}

/**
 * @description Prove the watcher is delivering events before a test relies on
 * one. `ready` is not enough on macOS: FSEvents starts asynchronously, so under
 * load a write right after `ready` is dropped outright and a poll waits on an
 * event that will never come. Keep re-writing a probe until the watcher reports
 * it, then remove it and wait for that too, so no probe traffic leaks into the
 * test's own assertions. Only a genuine hang fails, at the test timeout.
 * Rewrites are spaced wider than the debounce window: each event restarts it,
 * so rewriting faster than it would keep the probe's batch from ever flushing.
 */
async function confirmLive(
  probePath: string,
  signals: ProbeSignals,
): Promise<void> {
  let revision = 0;
  let writes = writeFile(probePath, String(revision));
  const timer = setInterval(() => {
    revision += 1;
    const content = String(revision);
    writes = writes.then(() => writeFile(probePath, content));
  }, signals.debounceMs + 50);
  try {
    await signals.seen();
  } finally {
    clearInterval(timer);
  }
  // A rewrite still in flight would recreate the probe after the rm below.
  await writes;
  await rm(probePath);
  await signals.gone();
}

describe('watchWorkspace', () => {
  let root: string;
  let handle: WatchHandle | undefined;
  let events: Recorder<WatchEvent>;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ot-ide-watch-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await mkdir(join(root, 'dist'), { recursive: true });
    await writeFile(join(root, '.gitignore'), 'dist\nignored.txt\n');
    await writeFile(join(root, 'src', 'a.ts'), 'export const a = 1;\n');
    events = createRecorder();
  });

  afterEach(async () => {
    await handle?.close();
    handle = undefined;
    await rm(root, { force: true, recursive: true });
  });

  const start = async (debounceMs = 10): Promise<void> => {
    handle = watchWorkspace(
      { root },
      { debounceMs, onEvents: (batch) => events.push(batch) },
    );
    await handle.ready;
    await confirmLive(join(root, 'src', 'probe.txt'), {
      debounceMs,
      gone: () => saw('unlink', 'src/probe.txt'),
      seen: () => {
        return events.until((items) => {
          return items.some((event) => event.path === 'src/probe.txt');
        });
      },
    });
    events.reset();
  };

  const find = (
    type: WatchEvent['type'],
    path: string,
  ): WatchEvent | undefined => {
    return events.items.find((event) => {
      return event.type === type && event.path === path;
    });
  };

  const saw = (type: WatchEvent['type'], path: string): Promise<void> => {
    return events.until((items) => {
      return items.some((event) => event.type === type && event.path === path);
    });
  };

  it('emits add/change/unlink events with workspace-relative POSIX paths', async () => {
    await start();

    await writeFile(join(root, 'src', 'b.ts'), 'export const b = 2;\n');
    await saw('add', 'src/b.ts');

    await writeFile(join(root, 'src', 'b.ts'), 'export const b = 3;\n');
    await saw('change', 'src/b.ts');

    await rm(join(root, 'src', 'b.ts'));
    await saw('unlink', 'src/b.ts');
  });

  it('reports a file created then written within one window as add', async () => {
    // A long window holds the create and the follow-up write in one batch, so
    // latest-wins coalescing would turn the new file into a bare `change`.
    await start(200);

    await writeFile(join(root, 'src', 'e.ts'), '');
    await appendFile(join(root, 'src', 'e.ts'), 'export const e = 6;\n');
    // Latest-wins would report this pair as `change` only, so the `add` this
    // waits on would never arrive. A later, separate `change` batch is fine.
    await saw('add', 'src/e.ts');

    expect(find('add', 'src/e.ts')).toEqual({ path: 'src/e.ts', type: 'add' });
  });

  it('does not emit events for gitignored or excluded files', async () => {
    await start();

    await writeFile(join(root, 'dist', 'out.js'), 'compiled');
    await writeFile(join(root, 'ignored.txt'), 'nope');
    // A tracked write we can wait on, proving the watcher is live.
    await writeFile(join(root, 'src', 'c.ts'), 'export const c = 4;\n');
    await saw('add', 'src/c.ts');

    expect(events.items.some((event) => event.path.startsWith('dist/'))).toBe(
      false,
    );
    expect(find('add', 'ignored.txt')).toBeUndefined();
  });

  it('stops emitting after close()', async () => {
    await start();

    await handle?.close();
    handle = undefined;
    events.reset();

    await writeFile(join(root, 'src', 'd.ts'), 'export const d = 5;\n');
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));

    expect(events.items).toEqual([]);
  });
});

describe('createWorkspaceIndex', () => {
  let root: string;
  let index: WorkspaceIndex | undefined;
  let deltas: Recorder<SnapshotDiff>;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ot-ide-index-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, '.gitignore'), 'dist\n');
    await writeFile(join(root, 'src', 'a.ts'), 'export const a = 1;\n');
    deltas = createRecorder();
  });

  afterEach(async () => {
    await index?.close();
    index = undefined;
    await rm(root, { force: true, recursive: true });
  });

  const start = async (): Promise<void> => {
    index = await createWorkspaceIndex({ root }, { debounceMs: 10 });
    index.subscribe((delta) => deltas.push([delta]));
    await confirmLive(join(root, 'src', 'probe.txt'), {
      debounceMs: 10,
      gone: () => saw('removed', 'src/probe.txt'),
      seen: () => saw('added', 'src/probe.txt'),
    });
    deltas.reset();
  };

  const pathsIn = (
    items: readonly SnapshotDiff[],
    key: keyof SnapshotDiff,
  ): string[] => {
    return items.flatMap((delta) => delta[key]);
  };

  const saw = (key: keyof SnapshotDiff, path: string): Promise<void> => {
    return deltas.until((items) => pathsIn(items, key).includes(path));
  };

  it('seeds the snapshot from hashWorkspace', async () => {
    await start();

    const paths = index?.getSnapshot().map((entry) => entry.path) ?? [];
    expect(paths.sort()).toEqual(['.gitignore', 'src/a.ts']);
  });

  it('emits incremental deltas as files are added, changed, and removed', async () => {
    await start();

    await writeFile(join(root, 'src', 'b.ts'), 'export const b = 2;\n');
    await saw('added', 'src/b.ts');

    await writeFile(join(root, 'src', 'a.ts'), 'export const a = 99;\n');
    await saw('changed', 'src/a.ts');

    await rm(join(root, 'src', 'b.ts'));
    await saw('removed', 'src/b.ts');

    const snapshotPaths = index?.getSnapshot().map((entry) => entry.path) ?? [];
    expect(snapshotPaths.sort()).toEqual(['.gitignore', 'src/a.ts']);
  });

  it('does not emit a delta when content is rewritten identically', async () => {
    await start();

    await writeFile(join(root, 'src', 'a.ts'), 'export const a = 1;\n');
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));

    expect(deltas.items).toEqual([]);
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
