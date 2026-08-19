import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { watch as chokidarWatch } from 'chokidar';
import ignore from 'ignore';

import type {
  ResolvedWorkspaceConfig,
  WorkspaceConfig,
} from '../config/workspace-config.ts';
import { resolveWorkspaceConfig } from '../config/workspace-config.ts';
import { hashFile } from '../utils/hash.ts';
import type { SnapshotDiff, WorkspaceFileHash } from './workspace.ts';
import { diffSnapshots, hashWorkspace } from './workspace.ts';

/** The kind of filesystem change observed for a watched file. */
export type WatchEventType = 'add' | 'change' | 'unlink';

/** A single coalesced filesystem change for a tracked workspace file. */
export interface WatchEvent {
  /** Workspace-relative POSIX path of the file. */
  path: string;
  /** What happened to the file. */
  type: WatchEventType;
}

/** Callbacks supplied to {@link watchWorkspace}. */
export interface WatchHandlers {
  /**
   * Debounce window in milliseconds used to coalesce rapid successive writes
   * into a single batch. Defaults to {@link DEFAULT_WATCH_DEBOUNCE_MS}.
   */
  debounceMs?: number;
  /** Called when the underlying watcher emits an error. */
  onError?: (error: unknown) => void;
  /**
   * Called once per debounce window with the coalesced batch of events. At most
   * one event per path is reported per batch (the latest one wins).
   */
  onEvents: (events: WatchEvent[]) => void;
}

/** A running watcher you can tear down. Returned by {@link watchWorkspace}. */
export interface WatchHandle {
  /** Stop watching and fully release the underlying watcher's resources. */
  close: () => Promise<void>;
  /**
   * Resolves once the watcher has finished its initial scan and is live.
   * Until then, writes may land before the watcher is listening and go
   * unreported, so callers that need to observe a specific change should await
   * this first rather than guessing with a sleep.
   */
  ready: Promise<void>;
}

/** Default debounce window applied when {@link WatchHandlers.debounceMs} is omitted. */
export const DEFAULT_WATCH_DEBOUNCE_MS = 50;

/**
 * Watch a workspace for file changes, emitting debounced `add`/`change`/`unlink`
 * events with workspace-relative POSIX paths. Scoping mirrors {@link listFiles}:
 * `.gitignore` rules (when `respectGitignore` is on) and the config's exclude
 * globs are honored, and the `.git` directory is never watched — so downstream
 * layers only ever hear about files that are actually part of the project.
 *
 * The returned handle's `close()` tears the watcher down completely; any
 * pending debounced batch is dropped.
 *
 * @public
 */
export function watchWorkspace(
  config: WorkspaceConfig,
  handlers: WatchHandlers,
): WatchHandle {
  const resolved = resolveWorkspaceConfig(config);
  const isIgnored = createIgnoreMatcher(resolved);
  const debounceMs = handlers.debounceMs ?? DEFAULT_WATCH_DEBOUNCE_MS;

  const pending = new Map<string, WatchEvent>();
  let flushTimer: NodeJS.Timeout | undefined;
  let closed = false;

  const flush = (): void => {
    flushTimer = undefined;
    if (closed || pending.size === 0) {
      return;
    }
    const batch = [...pending.values()];
    pending.clear();
    handlers.onEvents(batch);
  };

  const enqueue = (type: WatchEventType, absolutePath: string): void => {
    const path = toRelativePath(absolutePath, resolved);
    pending.set(path, { path, type });
    if (flushTimer) {
      clearTimeout(flushTimer);
    }
    flushTimer = setTimeout(flush, debounceMs);
    flushTimer.unref?.();
  };

  const watcher = chokidarWatch(resolved.root, {
    followSymlinks: resolved.followSymlinks,
    ignoreInitial: true,
    ignored: (candidate, stats) => isIgnored(candidate, stats),
  });

  const ready = new Promise<void>((resolveReady) => {
    watcher.once('ready', () => resolveReady());
  });

  watcher.on('add', (path) => enqueue('add', path));
  watcher.on('change', (path) => enqueue('change', path));
  watcher.on('unlink', (path) => enqueue('unlink', path));
  if (handlers.onError) {
    watcher.on('error', handlers.onError);
  }

  return {
    close: async (): Promise<void> => {
      closed = true;
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = undefined;
      }
      pending.clear();
      await watcher.close();
    },
    ready,
  };
}

/**
 * Build a predicate that decides whether chokidar should ignore a path,
 * reproducing the scoping {@link listFiles} applies: the `.git` directory and
 * the config's exclude globs always, plus the root `.gitignore` patterns when
 * `respectGitignore` is enabled. The watched root itself is never ignored.
 */
function createIgnoreMatcher(
  resolved: ResolvedWorkspaceConfig,
): (absolutePath: string, stats?: { isDirectory?: () => boolean }) => boolean {
  const matcher = ignore().add(resolved.exclude);

  if (resolved.respectGitignore) {
    const gitignore = readFileSafely(join(resolved.root, '.gitignore'));
    if (gitignore) {
      matcher.add(gitignore);
    }
    const ignoreFile = readFileSafely(join(resolved.root, '.ignore'));
    if (ignoreFile) {
      matcher.add(ignoreFile);
    }
  }

  return (absolutePath: string): boolean => {
    const path = toRelativePath(absolutePath, resolved);
    // Never ignore the watched root (empty relative path) and never try to
    // match a path that escaped the root — `ignore` throws on both.
    if (path === '' || path.startsWith('..')) {
      return false;
    }
    return matcher.ignores(path);
  };
}

function readFileSafely(absolutePath: string): string | undefined {
  try {
    return readFileSync(absolutePath, 'utf8');
  } catch {
    return undefined;
  }
}

function toRelativePath(
  absolutePath: string,
  resolved: ResolvedWorkspaceConfig,
): string {
  return relative(resolved.root, absolutePath).split(sep).join('/');
}

/** Receives the {@link SnapshotDiff} for each batch of changes. */
export type IndexSubscriber = (delta: SnapshotDiff) => void;

/** A live, self-updating workspace index. Returned by {@link createWorkspaceIndex}. */
export interface WorkspaceIndex {
  /** Stop watching and release the underlying watcher's resources. */
  close: () => Promise<void>;
  /**
   * The current snapshot: a stable copy of every tracked file's path and
   * content hash, kept fresh as files change.
   */
  getSnapshot: () => WorkspaceFileHash[];
  /**
   * Subscribe to incremental deltas. The handler fires once per settled batch
   * with the `{ added, changed, removed }` diff. Returns an unsubscribe fn.
   */
  subscribe: (handler: IndexSubscriber) => () => void;
}

/**
 * Build a live in-memory index of a workspace: seed the snapshot from
 * {@link hashWorkspace}, then keep it fresh by watching for changes. Each
 * settled batch re-hashes only the added/changed files (never the whole tree),
 * updates the snapshot, and emits the computed {@link SnapshotDiff} to
 * subscribers — so downstream layers re-process exactly what moved.
 *
 * Subscribers are notified only when a batch actually changes the snapshot, so
 * a `change` event whose content hash is unchanged emits nothing.
 *
 * @public
 */
export async function createWorkspaceIndex(
  config: WorkspaceConfig,
  handlers?: Pick<WatchHandlers, 'debounceMs' | 'onError'>,
): Promise<WorkspaceIndex> {
  const resolved = resolveWorkspaceConfig(config);
  let snapshot = await hashWorkspace(config);
  const subscribers = new Set<IndexSubscriber>();

  // Serialize batch processing so concurrent flushes never race on `snapshot`.
  let queue: Promise<void> = Promise.resolve();

  const applyBatch = async (events: WatchEvent[]): Promise<void> => {
    const prev = snapshot;
    const byPath = new Map(prev.map((entry) => [entry.path, entry.hash]));

    // Each path appears at most once per coalesced batch, so re-hashing the
    // added/changed files concurrently can't race on a shared key.
    await Promise.all(
      events.map(async (event) => {
        if (event.type === 'unlink') {
          byPath.delete(event.path);
          return;
        }
        try {
          byPath.set(
            event.path,
            await hashFile(join(resolved.root, event.path)),
          );
        } catch {
          // The file vanished between the event and the re-hash; treat as gone.
          byPath.delete(event.path);
        }
      }),
    );

    const next = [...byPath.entries()]
      .map(([path, hash]) => ({ hash, path }))
      .sort((a, b) => a.path.localeCompare(b.path));
    snapshot = next;

    const delta = diffSnapshots(prev, next);
    if (delta.added.length || delta.changed.length || delta.removed.length) {
      for (const handler of subscribers) {
        handler(delta);
      }
    }
  };

  const watcher = watchWorkspace(config, {
    debounceMs: handlers?.debounceMs,
    onError: handlers?.onError,
    onEvents: (events) => {
      queue = queue.then(() => applyBatch(events));
    },
  });

  // Resolve only once the watcher is actually listening: a caller that awaits
  // this function then immediately writes a file should see that write, not
  // race the initial scan.
  await watcher.ready;

  return {
    close: async (): Promise<void> => {
      await watcher.close();
      await queue;
      subscribers.clear();
    },
    getSnapshot: (): WorkspaceFileHash[] =>
      snapshot.map((entry) => ({ ...entry })),
    subscribe: (handler: IndexSubscriber): (() => void) => {
      subscribers.add(handler);
      return () => {
        subscribers.delete(handler);
      };
    },
  };
}
