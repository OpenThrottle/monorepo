import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { watch as chokidarWatch } from 'chokidar';
import ignore from 'ignore';

import type {
  ResolvedWorkspaceConfig,
  WorkspaceConfig,
} from '../config/workspace-config.js';
import { resolveWorkspaceConfig } from '../config/workspace-config.js';

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
 * @publicApi
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
