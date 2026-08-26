/**
 * Unit tests for the install/update executor. Backend allowlisting and command construction are
 * asserted directly; the streaming/timeout/abort paths are exercised through an injected fake spawn
 * (an EventEmitter with stdout/stderr) so NO network installer ever runs.
 */

import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';

import {
  augmentPathForInstall,
  buildAgentSetupCommand,
  runAgentSetup,
} from '../agent-setup-executor.ts';
import type { AgentSetupSpawn } from '../agent-setup-executor.ts';
import { getDriver } from '@openthrottle/openthrottle-drivers';

/** A minimal ChildProcess stand-in: stdout/stderr emitters + kill spy. */
class FakeChild extends EventEmitter {
  public readonly stderr = new EventEmitter();
  public readonly stdout = new EventEmitter();
  public readonly kill = vi.fn();
}

const HERMETIC_ENV: NodeJS.ProcessEnv = {
  HOME: '/home/tester',
  PATH: '/usr/bin',
};

describe('buildAgentSetupCommand', () => {
  it('builds a fixed `sh -c curl | shell` install command from the registry', () => {
    const command = buildAgentSetupCommand(
      getDriver('claude'),
      'install',
      HERMETIC_ENV,
    );
    expect(command).toEqual({
      args: ['-c', 'curl -fsSL https://claude.ai/install.sh | bash'],
      file: 'sh',
    });
  });

  it('honors the installer shell per driver (codex uses sh)', () => {
    const command = buildAgentSetupCommand(
      getDriver('codex'),
      'install',
      HERMETIC_ENV,
    );
    expect(command?.args[1]).toBe(
      'curl -fsSL https://chatgpt.com/codex/install.sh | sh',
    );
  });

  it('builds a `<binary> <argv>` command for a command-method update', () => {
    expect(
      buildAgentSetupCommand(getDriver('opencode'), 'update', HERMETIC_ENV),
    ).toEqual({ args: ['upgrade'], file: 'opencode' });
  });

  it('re-runs the installer for a reinstall-method update (cursor)', () => {
    expect(
      buildAgentSetupCommand(getDriver('cursor'), 'update', HERMETIC_ENV),
    ).toEqual({
      args: ['-c', 'curl -fsSL https://cursor.com/install | bash'],
      file: 'sh',
    });
  });

  it('builds an npm global install for an npm-method descriptor (gemini)', () => {
    expect(
      buildAgentSetupCommand(getDriver('gemini'), 'install', HERMETIC_ENV),
    ).toEqual({
      args: ['install', '--global', '@google/gemini-cli'],
      file: 'npm',
    });
  });

  it('re-runs the npm install for a reinstall-method update (gemini)', () => {
    expect(
      buildAgentSetupCommand(getDriver('gemini'), 'update', HERMETIC_ENV),
    ).toEqual({
      args: ['install', '--global', '@google/gemini-cli'],
      file: 'npm',
    });
  });

  it('resolves the binary via the bin-env override for command updates', () => {
    const command = buildAgentSetupCommand(getDriver('claude'), 'update', {
      ...HERMETIC_ENV,
      OPENTHROTTLE_CLAUDE_BIN: '/opt/claude/claude',
    });
    expect(command).toEqual({ args: ['update'], file: '/opt/claude/claude' });
  });
});

describe('augmentPathForInstall', () => {
  it('prepends per-user install dirs to PATH, deduped and order-preserving', () => {
    const path = augmentPathForInstall({
      HOME: '/home/tester',
      PATH: '/usr/bin:/home/tester/.local/bin',
    });
    const parts = path.split(':');
    expect(parts[0]).toBe('/home/tester/.local/bin');
    expect(parts).toContain('/home/tester/.bun/bin');
    expect(parts).toContain('/usr/bin');
    // .local/bin appeared in both the extras and the original PATH → only once.
    expect(parts.filter((p) => p === '/home/tester/.local/bin')).toHaveLength(
      1,
    );
  });

  it('returns PATH unchanged when HOME is missing', () => {
    expect(augmentPathForInstall({ PATH: '/usr/bin' })).toBe('/usr/bin');
  });
});

describe('runAgentSetup backend allowlisting', () => {
  it('rejects an unknown backend without spawning', async () => {
    const spawnFn: AgentSetupSpawn = vi.fn(() => new FakeChild());
    const result = await runAgentSetup({
      backend: 'totally-not-a-cli',
      mode: 'install',
      spawnFn,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unknown-backend');
    expect(spawnFn).not.toHaveBeenCalled();
  });

  it('rejects an already-aborted signal without spawning', async () => {
    const spawnFn: AgentSetupSpawn = vi.fn(() => new FakeChild());
    const controller = new AbortController();
    controller.abort();
    const result = await runAgentSetup({
      backend: 'claude',
      env: HERMETIC_ENV,
      mode: 'install',
      signal: controller.signal,
      spawnFn,
    });
    expect(result.reason).toBe('aborted');
    expect(spawnFn).not.toHaveBeenCalled();
  });
});

describe('runAgentSetup execution', () => {
  it('streams stdout/stderr chunks and resolves ok on clean exit', async () => {
    const child = new FakeChild();
    const spawnFn: AgentSetupSpawn = (file, args, options) => {
      // Only the registry-derived command is ever spawned.
      expect(file).toBe('sh');
      expect(args).toEqual([
        '-c',
        'curl -fsSL https://claude.ai/install.sh | bash',
      ]);
      // PATH was augmented with the install dirs.
      expect(options.env.PATH?.startsWith('/home/tester/.local/bin')).toBe(
        true,
      );
      return child;
    };

    const chunks: string[] = [];
    const run = runAgentSetup({
      backend: 'claude',
      env: HERMETIC_ENV,
      mode: 'install',
      onChunk: (c) => chunks.push(`${c.stream}:${c.data}`),
      spawnFn,
    });

    child.stdout.emit('data', Buffer.from('downloading...'));
    child.stderr.emit('data', Buffer.from('a warning'));
    child.emit('close', 0);

    const result = await run;
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(chunks).toEqual(['stdout:downloading...', 'stderr:a warning']);
  });

  it('resolves a non-zero-exit failure with the exit code', async () => {
    const child = new FakeChild();
    const run = runAgentSetup({
      backend: 'grok',
      env: HERMETIC_ENV,
      mode: 'install',
      spawnFn: () => child,
    });
    child.emit('close', 3);
    const result = await run;
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('non-zero-exit');
    expect(result.exitCode).toBe(3);
  });

  it('resolves spawn-error when the child errors', async () => {
    const child = new FakeChild();
    const run = runAgentSetup({
      backend: 'grok',
      env: HERMETIC_ENV,
      mode: 'install',
      spawnFn: () => child,
    });
    child.emit('error', new Error('ENOENT'));
    const result = await run;
    expect(result.reason).toBe('spawn-error');
  });

  it('times out, kills the child, and resolves a timeout failure', async () => {
    vi.useFakeTimers();
    const child = new FakeChild();
    const run = runAgentSetup({
      backend: 'opencode',
      env: HERMETIC_ENV,
      mode: 'update',
      spawnFn: () => child,
      timeoutMs: 1_000,
    });
    await vi.advanceTimersByTimeAsync(1_000);
    const result = await run;
    expect(result.reason).toBe('timeout');
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    vi.useRealTimers();
  });

  it('aborts mid-run, kills the child, and resolves an aborted failure', async () => {
    const child = new FakeChild();
    const controller = new AbortController();
    const run = runAgentSetup({
      backend: 'opencode',
      env: HERMETIC_ENV,
      mode: 'update',
      signal: controller.signal,
      spawnFn: () => child,
    });
    controller.abort();
    const result = await run;
    expect(result.reason).toBe('aborted');
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
  });
});
