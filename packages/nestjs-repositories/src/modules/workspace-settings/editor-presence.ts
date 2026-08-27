/**
 * @description Host probe for which workspace editors are actually installed, so
 * `/settings/workspace` can hint rather than silently offer a deep link the OS has no
 * handler for. Mirrors the structure and tolerance of `discoverAgentClis`
 * (openthrottle-agentic-utils) but is a filesystem probe, not a conversation backend —
 * and it lives here rather than in agentic-utils because it is keyed by
 * {@link WorkspaceEditorId}, and agentic-utils cannot import this package without
 * inverting the dependency between them.
 *
 * **The result is three-state, never a boolean.** `not_found` is a positive claim —
 * "the probe ran on the user's machine and the editor is not there". Anything that
 * makes that claim untrustworthy yields `unknown` instead:
 *
 * - the server is containerized, so the filesystem it can see is not the user's
 *   (bridge mapping configured, or a `/.dockerenv` / `/run/.containerenv` marker);
 * - the platform is outside v1 coverage (macOS only — see {@link SUPPORTED_PLATFORM});
 * - the probe threw or timed out.
 *
 * Callers must treat every state as advisory. Stored `enabledEditors` stays
 * authoritative: detection never gates enabling an editor, because a user behind a
 * containerized server sees `unknown` for everything and must retain full control.
 *
 * **Detection is bundle-presence only.** Support directories (`~/.vscode`,
 * `~/Library/Application Support/Code`), preference plists and saved application state
 * all survive an uninstall indefinitely, so consulting them would report `installed`
 * for an editor that has been gone for years. Only the `.app` bundle counts. A `code`
 * or `cursor` binary on `PATH` is likewise unreliable: both ship that shell command
 * opt-in, so its absence says nothing about the app.
 *
 * Security: the probe is allowlist-only. Bundle names and identifiers come from
 * {@link EDITOR_PROBES}; nothing caller-supplied is ever stat-ed or spawned.
 */

import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { getWorkspacePathMapping } from '@openthrottle/openthrottle-agentic-utils';
import { WORKSPACE_EDITOR_IDS } from './workspace-editor-id';
import type { WorkspaceEditorId } from './workspace-editor-id';

/**
 * Presence states. `installed` and `not_found` are claims about the user's machine;
 * `unknown` is the honest answer whenever we are not entitled to make one.
 *
 * @public
 */
export const EDITOR_PRESENCE_STATES = [
  'installed',
  'not_found',
  'unknown',
] as const;

/**
 * @public
 */
export type EditorPresenceState = (typeof EDITOR_PRESENCE_STATES)[number];

/**
 * Probed presence of a single editor.
 *
 * @public
 */
export interface EditorPresence {
  readonly editor: WorkspaceEditorId;
  readonly presence: EditorPresenceState;
}

/**
 * Result of one editor-presence sweep.
 *
 * @public
 */
export interface EditorPresenceResult {
  /** Every editor in the vocabulary, in {@link WORKSPACE_EDITOR_IDS} order. */
  readonly editors: readonly EditorPresence[];
  /** ISO-8601 scan timestamp (caller-stamped, else current time). */
  readonly scannedAt: string;
  /**
   * True when the probe was trusted to run against the user's own machine. False
   * means every entry is `unknown` — the UI should render no hints at all rather
   * than implying anything about what is installed.
   */
  readonly trusted: boolean;
}

/**
 * Options for {@link detectEditorPresence}.
 *
 * @public
 */
export interface DetectEditorPresenceOptions {
  /** Environment used for the container-bridge and HOME lookups (defaults to process.env). */
  readonly env?: NodeJS.ProcessEnv;
  /** Spotlight-fallback timeout in ms (default 3000). */
  readonly mdfindTimeoutMs?: number;
  /** Platform under test (defaults to process.platform). */
  readonly platform?: NodeJS.Platform;
  /** ISO-8601 scan timestamp; defaults to now when omitted. */
  readonly scannedAt?: string;
}

/** The one platform with a detection mechanism we could verify. See module JSDoc. */
const SUPPORTED_PLATFORM: NodeJS.Platform = 'darwin';

/** Container marker files — Docker and Podman respectively. */
const CONTAINER_MARKERS = ['/.dockerenv', '/run/.containerenv'] as const;

/** macOS application roots, in the order Launch Services itself prefers. */
const MACOS_APPLICATION_ROOTS = ['/Applications', '~/Applications'] as const;

const DEFAULT_MDFIND_TIMEOUT_MS = 3000;

/**
 * How to recognise one editor on macOS. Bundle names drive the cheap stat sweep;
 * the identifier is used only by the Spotlight fallback.
 */
interface EditorProbe {
  /**
   * `CFBundleIdentifier`, used only to justify a `not_found` via Spotlight. Read off
   * the installed app (or the app-written preference plist) — never guessed.
   */
  readonly bundleId: string;
  /** Bundle directory names to look for under each {@link MACOS_APPLICATION_ROOTS} entry. */
  readonly bundleNames: readonly string[];
}

/**
 * Per-editor probe table. Exhaustive over {@link WorkspaceEditorId}, so adding an
 * editor to the vocabulary fails typecheck here rather than silently reporting
 * `not_found` for it.
 *
 * Deliberately NOT derived from the `openthrottle-drivers` registry: that registry's
 * `cursor` is the `cursor-agent` CLI and its `claude` is the `claude-code` CLI, which
 * are different artifacts from the desktop apps that register `cursor://` and
 * `vscode://`. Someone can have either without the other.
 */
const EDITOR_PROBES: Record<WorkspaceEditorId, EditorProbe> = {
  // The app that actually registers `claude:` — read off `CFBundleURLTypes`, not
  // inferred from the name. "Claude Code URL Handler.app"
  // (com.anthropic.claude-code-url-handler) is the tempting wrong answer: it registers
  // `claude-cli`, so it does NOT handle the `claude://code/new` deep link the plan
  // toolbar emits. Probing it would report `not_found` for a working button.
  claude: {
    bundleId: 'com.anthropic.claudefordesktop',
    bundleNames: ['Claude.app'],
  },
  cursor: {
    bundleId: 'com.todesktop.230313mzl4w4u92',
    bundleNames: ['Cursor.app'],
  },
  vscode: {
    bundleId: 'com.microsoft.VSCode',
    bundleNames: ['Visual Studio Code.app'],
  },
};

/** Resolves `~`-prefixed application roots against HOME; absolute roots pass through. */
function resolveApplicationRoots(env: NodeJS.ProcessEnv): readonly string[] {
  const home = env.HOME?.trim();

  return MACOS_APPLICATION_ROOTS.flatMap((root) => {
    if (!root.startsWith('~')) return [root];
    if (home === undefined || home === '') return [];
    return [join(home, root.slice(1))];
  });
}

/** Errno codes that mean the path genuinely is not there. */
const ABSENT_ERROR_CODES = ['ENOENT', 'ENOTDIR'] as const;

/** True when the rejection is an errno error proving the path is absent. */
const isAbsentError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return false;
  }

  const { code } = error;
  return ABSENT_ERROR_CODES.some((absent) => absent === code);
};

/**
 * True when `path` exists, false when it provably does not — and **throws** when we
 * cannot tell (EACCES, EIO, a stubbed-out filesystem). Callers turn that throw into
 * `unknown`, which is the point: swallowing it would let an unreadable filesystem
 * masquerade as "the editor is not installed", the exact confidently-wrong answer this
 * module exists to avoid.
 */
async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (isAbsentError(error)) return false;
    throw error;
  }
}

/**
 * Whether the probe may make claims about the caller's machine at all. A containerized
 * server sees its own filesystem, not the user's, so it must never say `not_found` —
 * that would tell someone their working editor is missing.
 *
 * Two independent signals: the host-execution bridge env (set by every server service
 * in `docker-compose.yml`), and the container marker files (which catch a container
 * started outside that compose config, where the bridge vars are absent).
 */
async function isTrustedHost(
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
): Promise<boolean> {
  if (platform !== SUPPORTED_PLATFORM) return false;
  if (getWorkspacePathMapping(env) !== undefined) return false;

  // Propagates if a marker cannot be stat-ed: not knowing whether we are in a
  // container is itself a reason not to trust the probe.
  const markers = await Promise.all(CONTAINER_MARKERS.map(exists));
  return !markers.includes(true);
}

/**
 * Spotlight lookup by bundle identifier, to catch an editor installed somewhere
 * non-standard before we claim it is absent. Resolves `installed` on a hit,
 * `not_found` on a clean empty result, and `unknown` on anything that means the query
 * did not complete (spawn error, non-zero exit, timeout) — a failed probe is never
 * evidence of absence.
 */
function findByBundleId(
  bundleId: string,
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
): Promise<EditorPresenceState> {
  return new Promise((resolve) => {
    let stdout = '';
    let settled = false;

    /** Guards against a late `close` after the timeout already resolved. */
    const settle = (state: EditorPresenceState): void => {
      if (settled) return;
      settled = true;
      resolve(state);
    };

    const child = spawn(
      'mdfind',
      ['-onlyin', '/', `kMDItemCFBundleIdentifier == '${bundleId}'`],
      {
        env: { HOME: env.HOME, PATH: env.PATH },
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      settle('unknown');
    }, timeoutMs);

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString('utf8');
    });

    child.on('error', () => {
      clearTimeout(timer);
      settle('unknown');
    });

    child.on('close', (code) => {
      clearTimeout(timer);

      if (code !== 0) {
        settle('unknown');
        return;
      }

      settle(stdout.trim() === '' ? 'not_found' : 'installed');
    });
  });
}

/**
 * Probe one editor: stat the allowlisted bundle paths first (measured at ~0.07ms for
 * the whole sweep), and only fall through to a Spotlight spawn (~70ms) when every
 * path missed. That pays the spawn solely to justify a negative — the one positive
 * claim this module makes — while still reporting `installed` for an app in an
 * unusual location.
 */
async function probeEditor(
  editor: WorkspaceEditorId,
  roots: readonly string[],
  env: NodeJS.ProcessEnv,
  mdfindTimeoutMs: number,
): Promise<EditorPresence> {
  const probe = EDITOR_PROBES[editor];
  const candidates = roots.flatMap((root) =>
    probe.bundleNames.map((bundleName) => join(root, bundleName)),
  );

  const hits = await Promise.all(candidates.map(exists));
  if (hits.includes(true)) return { editor, presence: 'installed' };

  return {
    editor,
    presence: await findByBundleId(probe.bundleId, env, mdfindTimeoutMs),
  };
}

/**
 * Probe every editor in the vocabulary for installed-ness on the server's host.
 *
 * Tolerant by construction: an untrusted host or an unsupported platform short-circuits
 * to all-`unknown`, and one editor's probe throwing degrades that editor to `unknown`
 * without failing the sweep. Never rejects.
 *
 * @public
 */
export async function detectEditorPresence(
  options: DetectEditorPresenceOptions = {},
): Promise<EditorPresenceResult> {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const mdfindTimeoutMs = options.mdfindTimeoutMs ?? DEFAULT_MDFIND_TIMEOUT_MS;
  const scannedAt = options.scannedAt ?? new Date().toISOString();

  const untrusted: EditorPresenceResult = {
    editors: WORKSPACE_EDITOR_IDS.map((editor) => ({
      editor,
      presence: 'unknown',
    })),
    scannedAt,
    trusted: false,
  };

  let trusted = false;
  try {
    trusted = await isTrustedHost(env, platform);
  } catch {
    return untrusted;
  }

  if (!trusted) return untrusted;

  const roots = resolveApplicationRoots(env);

  const editors = await Promise.all(
    WORKSPACE_EDITOR_IDS.map(async (editor) => {
      try {
        return await probeEditor(editor, roots, env, mdfindTimeoutMs);
      } catch {
        // One editor's failure is never evidence about that editor, and never
        // fails the sweep for the others.
        return { editor, presence: 'unknown' } satisfies EditorPresence;
      }
    }),
  );

  return { editors, scannedAt, trusted: true };
}
