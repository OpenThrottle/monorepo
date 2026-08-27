/**
 * @description Unit tests for the editor-presence probe. The `unknown` paths carry the
 * weight here: they are what stops a containerized server from telling someone their
 * working editor is missing, and they are the easy ones to get wrong. So each of them
 * is asserted independently — container bridge env, container marker file, unsupported
 * platform, a thrown probe, a Spotlight timeout and a non-zero Spotlight exit — rather
 * than trusting one shared code path to cover them all.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONTAINER_WORKSPACES_DIR_ENV,
  HOST_WORKSPACES_DIR_ENV,
} from '@openthrottle/openthrottle-agentic-utils';

const { mockAccess, mockSpawn } = vi.hoisted(() => ({
  mockAccess: vi.fn(),
  mockSpawn: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({ access: mockAccess }));
vi.mock('node:child_process', () => ({ spawn: mockSpawn }));

import { detectEditorPresence } from './editor-presence';
import type { EditorPresenceState } from './editor-presence';

const HOME = '/Users/jane';
const HOST_ENV: NodeJS.ProcessEnv = { HOME, PATH: '/usr/bin' };
const CLAUDE_BUNDLE = `/Applications/Claude.app`;
const CURSOR_BUNDLE = `/Applications/Cursor.app`;
const VSCODE_BUNDLE = `/Applications/Visual Studio Code.app`;

/** A rejection shaped like the real thing — the probe reads `code`, not the message. */
const errnoError = (code: string, path: string): NodeJS.ErrnoException => {
  const error: NodeJS.ErrnoException = new Error(`${code}: ${path}`);
  error.code = code;
  return error;
};

/**
 * Points `access` at an explicit set of existing paths. Everything else — including the
 * container markers — rejects ENOENT, which is what a plain host looks like.
 */
const filesystem = (existing: readonly string[]): void => {
  mockAccess.mockImplementation((path: string) =>
    existing.includes(path)
      ? Promise.resolve(undefined)
      : Promise.reject(errnoError('ENOENT', path)),
  );
};

type SpawnOutcome =
  | { readonly code: number; readonly kind: 'close'; readonly stdout: string }
  | { readonly kind: 'error' }
  | { readonly kind: 'hang' };

/**
 * Minimal `spawn` double: replays one outcome per invocation on the next tick so the
 * production code's listeners are attached first. `hang` never emits, exercising the
 * timeout path.
 */
const spawnReturns = (outcomeFor: (bundleId: string) => SpawnOutcome): void => {
  mockSpawn.mockImplementation((_command: string, args: readonly string[]) => {
    const query = args[args.length - 1] ?? '';
    const outcome = outcomeFor(query);
    const listeners = new Map<string, (arg?: unknown) => void>();
    const stdoutListeners: ((chunk: Buffer) => void)[] = [];

    const child = {
      kill: vi.fn(),
      on: (event: string, listener: (arg?: unknown) => void) => {
        listeners.set(event, listener);
        return child;
      },
      stdout: {
        on: (_event: string, listener: (chunk: Buffer) => void) => {
          stdoutListeners.push(listener);
        },
      },
    };

    if (outcome.kind !== 'hang') {
      setTimeout(() => {
        if (outcome.kind === 'error') {
          listeners.get('error')?.(new Error('spawn mdfind ENOENT'));
          return;
        }
        for (const listener of stdoutListeners) {
          listener(Buffer.from(outcome.stdout, 'utf8'));
        }
        listeners.get('close')?.(outcome.code);
      }, 0);
    }

    return child;
  });
};

/** Spotlight finds nothing for anything — the ordinary "genuinely absent" reply. */
const spotlightEmpty = (): void =>
  spawnReturns(() => ({ code: 0, kind: 'close', stdout: '' }));

const presenceOf = (
  result: {
    readonly editors: readonly {
      editor: string;
      presence: EditorPresenceState;
    }[];
  },
  editor: string,
): EditorPresenceState | undefined =>
  result.editors.find((entry) => entry.editor === editor)?.presence;

const detect = (overrides: Parameters<typeof detectEditorPresence>[0] = {}) =>
  detectEditorPresence({
    env: HOST_ENV,
    platform: 'darwin',
    scannedAt: '2026-08-27T00:00:00.000Z',
    ...overrides,
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('detectEditorPresence — trusted host', () => {
  it('reports installed for a bundle in /Applications without spawning Spotlight', async () => {
    filesystem([CLAUDE_BUNDLE, CURSOR_BUNDLE, VSCODE_BUNDLE]);
    spotlightEmpty();

    const result = await detect();

    expect(result.trusted).toBe(true);
    expect(presenceOf(result, 'cursor')).toBe('installed');
    expect(presenceOf(result, 'vscode')).toBe('installed');
    // The cheap stat sweep is the whole probe when the app is where it belongs.
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('reports installed for a bundle under ~/Applications', async () => {
    filesystem([`${HOME}/Applications/Cursor.app`]);
    spotlightEmpty();

    expect(presenceOf(await detect(), 'cursor')).toBe('installed');
  });

  it('probes Claude.app, not the Claude Code URL Handler', async () => {
    // The URL handler registers `claude-cli`; only Claude.app handles the
    // `claude://code/new` deep link, so it is the one whose presence predicts the
    // button working.
    filesystem([`${HOME}/Applications/Claude Code URL Handler.app`]);
    spotlightEmpty();

    const result = await detect();

    expect(presenceOf(result, 'claude')).toBe('not_found');

    const probed = mockAccess.mock.calls.map(([path]) => String(path));
    expect(probed).toContain(CLAUDE_BUNDLE);
    expect(probed).not.toContain(
      `${HOME}/Applications/Claude Code URL Handler.app`,
    );
  });

  it('reports Claude as installed when Claude.app is present', async () => {
    filesystem([CLAUDE_BUNDLE]);
    spotlightEmpty();

    expect(presenceOf(await detect(), 'claude')).toBe('installed');
  });

  it('reports the real mixed case: Cursor present, VS Code absent', async () => {
    filesystem([CURSOR_BUNDLE]);
    spotlightEmpty();

    const result = await detect();

    expect(presenceOf(result, 'cursor')).toBe('installed');
    expect(presenceOf(result, 'vscode')).toBe('not_found');
  });

  it('falls back to Spotlight and reports installed for a non-standard location', async () => {
    filesystem([]);
    spawnReturns((query) =>
      query.includes('com.microsoft.VSCode')
        ? {
            code: 0,
            kind: 'close',
            stdout: '/Users/jane/Tools/Visual Studio Code.app\n',
          }
        : { code: 0, kind: 'close', stdout: '' },
    );

    const result = await detect();

    expect(presenceOf(result, 'vscode')).toBe('installed');
    expect(presenceOf(result, 'cursor')).toBe('not_found');
  });

  it('stamps the caller-supplied scannedAt', async () => {
    filesystem([CLAUDE_BUNDLE, CURSOR_BUNDLE, VSCODE_BUNDLE]);
    spotlightEmpty();

    expect((await detect()).scannedAt).toBe('2026-08-27T00:00:00.000Z');
  });

  it('covers every editor in the vocabulary', async () => {
    filesystem([CLAUDE_BUNDLE, CURSOR_BUNDLE, VSCODE_BUNDLE]);
    spotlightEmpty();

    const result = await detect();

    expect(result.editors.map((entry) => entry.editor)).toEqual([
      'claude',
      'cursor',
      'vscode',
    ]);
  });
});

describe('detectEditorPresence — untrusted, must never claim not_found', () => {
  /** Asserts the whole sweep collapsed to unknown and never touched the filesystem probe. */
  const expectAllUnknown = (
    result: Awaited<ReturnType<typeof detect>>,
  ): void => {
    expect(result.trusted).toBe(false);
    expect(result.editors.map((entry) => entry.presence)).toEqual([
      'unknown',
      'unknown',
      'unknown',
    ]);
    expect(mockSpawn).not.toHaveBeenCalled();
  };

  it('returns unknown for every editor when the container bridge env is set', async () => {
    // Cursor IS on this filesystem — but it is the container's, not the user's, so
    // reporting anything about it would be a claim we are not entitled to make.
    filesystem([CURSOR_BUNDLE]);
    spotlightEmpty();

    expectAllUnknown(
      await detect({
        env: {
          ...HOST_ENV,
          [CONTAINER_WORKSPACES_DIR_ENV]: '/workspaces',
          [HOST_WORKSPACES_DIR_ENV]: '/Users/jane/dev',
        },
      }),
    );
  });

  it('returns unknown when only /.dockerenv marks the container', async () => {
    // The compose bridge vars are absent here — this is the container started outside
    // docker-compose, which the env signal alone would miss.
    filesystem([CURSOR_BUNDLE, '/.dockerenv']);
    spotlightEmpty();

    expectAllUnknown(await detect());
  });

  it('returns unknown when /run/.containerenv marks a Podman container', async () => {
    filesystem([CURSOR_BUNDLE, '/run/.containerenv']);
    spotlightEmpty();

    expectAllUnknown(await detect());
  });

  it.each<NodeJS.Platform>(['linux', 'win32'])(
    'returns unknown on %s, which has no verified probe',
    async (platform) => {
      filesystem([CURSOR_BUNDLE]);
      spotlightEmpty();

      expectAllUnknown(await detect({ platform }));
    },
  );

  it('returns unknown when the trust check itself throws', async () => {
    mockAccess.mockImplementation(() => {
      throw errnoError('EIO', '/.dockerenv');
    });
    spotlightEmpty();

    const result = await detect();

    expect(result.editors.map((entry) => entry.presence)).toEqual([
      'unknown',
      'unknown',
      'unknown',
    ]);
  });

  it('returns unknown when a container marker is unreadable', async () => {
    // Not knowing whether we are in a container is itself disqualifying: an EACCES on
    // /.dockerenv must not be read as "no container, go ahead and claim not_found".
    mockAccess.mockImplementation((path: string) =>
      path === '/.dockerenv'
        ? Promise.reject(errnoError('EACCES', path))
        : Promise.reject(errnoError('ENOENT', path)),
    );
    spotlightEmpty();

    expectAllUnknown(await detect());
  });
});

describe('detectEditorPresence — a failed probe is not evidence of absence', () => {
  it('returns unknown, not not_found, when Spotlight times out', async () => {
    filesystem([]);
    spawnReturns(() => ({ kind: 'hang' }));

    const result = await detect({ mdfindTimeoutMs: 10 });

    expect(presenceOf(result, 'cursor')).toBe('unknown');
    expect(presenceOf(result, 'vscode')).toBe('unknown');
  });

  it('returns unknown when Spotlight cannot be spawned', async () => {
    filesystem([]);
    spawnReturns(() => ({ kind: 'error' }));

    expect(presenceOf(await detect(), 'cursor')).toBe('unknown');
  });

  it('returns unknown when Spotlight exits non-zero', async () => {
    filesystem([]);
    spawnReturns(() => ({ code: 1, kind: 'close', stdout: '' }));

    expect(presenceOf(await detect(), 'cursor')).toBe('unknown');
  });

  it('degrades one editor to unknown without failing the sweep', async () => {
    filesystem([VSCODE_BUNDLE]);
    // Only Cursor's fallback breaks; VS Code was already found by the stat sweep.
    spawnReturns((query) =>
      query.includes('com.todesktop')
        ? { kind: 'error' }
        : { code: 0, kind: 'close', stdout: '' },
    );

    const result = await detect();

    expect(presenceOf(result, 'cursor')).toBe('unknown');
    expect(presenceOf(result, 'vscode')).toBe('installed');
  });

  it('never rejects, even when every layer fails', async () => {
    mockAccess.mockRejectedValue(errnoError('EIO', '/Applications'));
    spawnReturns(() => ({ kind: 'error' }));

    await expect(detect()).resolves.toBeDefined();
  });
});

describe('detectEditorPresence — allowlist', () => {
  it('only ever stats bundle paths under the two macOS application roots', async () => {
    filesystem([]);
    spotlightEmpty();

    await detect();

    const probed = mockAccess.mock.calls
      .map(([path]) => String(path))
      .filter((path) => path.endsWith('.app'));

    expect(probed.sort()).toEqual(
      [
        CLAUDE_BUNDLE,
        CURSOR_BUNDLE,
        VSCODE_BUNDLE,
        `${HOME}/Applications/Claude.app`,
        `${HOME}/Applications/Cursor.app`,
        `${HOME}/Applications/Visual Studio Code.app`,
      ].sort(),
    );
  });

  it('only ever spawns mdfind', async () => {
    filesystem([]);
    spotlightEmpty();

    await detect();

    for (const [command] of mockSpawn.mock.calls) {
      expect(command).toBe('mdfind');
    }
  });

  it('skips the home application root when HOME is unset', async () => {
    filesystem([]);
    spotlightEmpty();

    await detect({ env: { PATH: '/usr/bin' } });

    const probed = mockAccess.mock.calls
      .map(([path]) => String(path))
      .filter((path) => path.endsWith('.app'));

    expect(probed.sort()).toEqual(
      [CLAUDE_BUNDLE, CURSOR_BUNDLE, VSCODE_BUNDLE].sort(),
    );
  });
});
