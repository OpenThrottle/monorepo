import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';

import { describe, expect, it, vi } from 'vitest';

import {
  AGENT_IDLE_TIMEOUT_MS_ENV,
  AGENT_KILL_GRACE_MS_ENV,
  AGENT_SESSION_TIMEOUT_MS_ENV,
  AGENT_WALLCLOCK_TIMEOUT_MS_ENV,
  CHAT_IDLE_TIMEOUT_MS_ENV,
  resolveAgentTimeouts,
  resolveChatIdleTimeoutMs,
  resolveSessionCreateTimeoutMs,
  terminateChild,
} from '../teardown.ts';

/** Resolve once `child` emits `event`. */
function waitForEvent(child: ChildProcess, event: 'exit'): Promise<void> {
  return new Promise((resolve) => {
    child.once(event, () => resolve());
  });
}

/** Spawn a real, short-lived node child process running `script`. */
function spawnNode(script: string): ChildProcess {
  return spawn(process.execPath, ['-e', script]);
}

/** Resolve once `child` writes at least one line of stdout. */
function waitForReady(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    child.stdout?.once('data', () => resolve());
  });
}

describe('env var names', () => {
  it('are stable, namespaced strings', () => {
    expect(AGENT_IDLE_TIMEOUT_MS_ENV).toBe(
      'OPENTHROTTLE_AGENT_IDLE_TIMEOUT_MS',
    );
    expect(CHAT_IDLE_TIMEOUT_MS_ENV).toBe('OPENTHROTTLE_CHAT_IDLE_TIMEOUT_MS');
    expect(AGENT_WALLCLOCK_TIMEOUT_MS_ENV).toBe(
      'OPENTHROTTLE_AGENT_WALLCLOCK_TIMEOUT_MS',
    );
    expect(AGENT_KILL_GRACE_MS_ENV).toBe('OPENTHROTTLE_AGENT_KILL_GRACE_MS');
    expect(AGENT_SESSION_TIMEOUT_MS_ENV).toBe(
      'OPENTHROTTLE_AGENT_SESSION_TIMEOUT_MS',
    );
  });
});

describe('resolveAgentTimeouts', () => {
  it('falls back to safe defaults when env is empty', () => {
    expect(resolveAgentTimeouts({})).toEqual({
      graceMs: 5_000,
      idleMs: 120_000,
      wallClockMs: 900_000,
    });
  });

  it('honors positive-integer env overrides', () => {
    expect(
      resolveAgentTimeouts({
        [AGENT_IDLE_TIMEOUT_MS_ENV]: '1000',
        [AGENT_KILL_GRACE_MS_ENV]: '2000',
        [AGENT_WALLCLOCK_TIMEOUT_MS_ENV]: '3000',
      }),
    ).toEqual({ graceMs: 2000, idleMs: 1000, wallClockMs: 3000 });
  });

  it('falls back to defaults for invalid, zero, or negative overrides', () => {
    expect(
      resolveAgentTimeouts({
        [AGENT_IDLE_TIMEOUT_MS_ENV]: 'not-a-number',
        [AGENT_KILL_GRACE_MS_ENV]: '0',
        [AGENT_WALLCLOCK_TIMEOUT_MS_ENV]: '-100',
      }),
    ).toEqual({ graceMs: 5_000, idleMs: 120_000, wallClockMs: 900_000 });
  });
});

describe('resolveChatIdleTimeoutMs', () => {
  it('defaults to the per-agent idle timeout plus the fixed margin', () => {
    expect(resolveChatIdleTimeoutMs({})).toBe(120_000 + 30_000);
  });

  it('derives from an overridden per-agent idle timeout', () => {
    expect(
      resolveChatIdleTimeoutMs({ [AGENT_IDLE_TIMEOUT_MS_ENV]: '60000' }),
    ).toBe(60_000 + 30_000);
  });

  it('honors an explicit CHAT_IDLE_TIMEOUT_MS override, ignoring the per-agent value', () => {
    expect(
      resolveChatIdleTimeoutMs({
        [AGENT_IDLE_TIMEOUT_MS_ENV]: '60000',
        [CHAT_IDLE_TIMEOUT_MS_ENV]: '5000',
      }),
    ).toBe(5000);
  });

  it('falls back to the derived default when the override is invalid', () => {
    expect(
      resolveChatIdleTimeoutMs({ [CHAT_IDLE_TIMEOUT_MS_ENV]: 'nope' }),
    ).toBe(120_000 + 30_000);
  });
});

describe('resolveSessionCreateTimeoutMs', () => {
  it('defaults to 30s', () => {
    expect(resolveSessionCreateTimeoutMs({})).toBe(30_000);
  });

  it('honors a positive-integer override', () => {
    expect(
      resolveSessionCreateTimeoutMs({
        [AGENT_SESSION_TIMEOUT_MS_ENV]: '15000',
      }),
    ).toBe(15_000);
  });

  it('falls back to the default for an invalid override', () => {
    expect(
      resolveSessionCreateTimeoutMs({ [AGENT_SESSION_TIMEOUT_MS_ENV]: '-5' }),
    ).toBe(30_000);
  });
});

describe('terminateChild', () => {
  it('is a no-op when the child has already exited', async () => {
    const child = spawnNode('process.exit(0);');
    await waitForEvent(child, 'exit');

    const killSpy = vi.spyOn(child, 'kill');
    terminateChild(child, 5000);
    expect(killSpy).not.toHaveBeenCalled();
  });

  it('sends SIGTERM and the child exits before the grace period, avoiding SIGKILL', async () => {
    const child = spawnNode('setInterval(() => {}, 1000);');
    const killSpy = vi.spyOn(child, 'kill');

    terminateChild(child, 2000);
    await waitForEvent(child, 'exit');

    expect(killSpy).toHaveBeenCalledTimes(1);
    expect(killSpy).toHaveBeenCalledWith('SIGTERM');
    expect(child.signalCode).toBe('SIGTERM');
  });

  it('escalates to SIGKILL when the child ignores SIGTERM past the grace period', async () => {
    const child = spawnNode(
      "process.on('SIGTERM', () => {}); console.log('ready'); setInterval(() => {}, 1000);",
    );
    await waitForReady(child);
    const killSpy = vi.spyOn(child, 'kill');

    terminateChild(child, 100);
    await waitForEvent(child, 'exit');

    expect(killSpy).toHaveBeenCalledWith('SIGTERM');
    expect(killSpy).toHaveBeenCalledWith('SIGKILL');
    expect(child.signalCode).toBe('SIGKILL');
  }, 10_000);
});

describe('terminateChild process-group teardown', () => {
  it('reaps a grandchild that outlives the direct child when processGroup is set', async () => {
    // Mirrors cursor-agent: the child spawns a grandchild that would otherwise
    // survive the run (the observed `worker-server` leak).
    const child = spawn(
      process.execPath,
      [
        '-e',
        `const { spawn } = require('node:child_process');
         const grandchild = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000000)'], { stdio: 'ignore' });
         console.log(String(grandchild.pid));
         setInterval(() => {}, 1000000);`,
      ],
      { detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
    );

    const grandchildPid = await new Promise<number>((resolve) => {
      child.stdout?.once('data', (data: Buffer) =>
        resolve(Number.parseInt(data.toString('utf8').trim(), 10)),
      );
    });

    expect(() => process.kill(grandchildPid, 0)).not.toThrow();

    terminateChild(child, 50, { processGroup: true });
    await waitForEvent(child, 'exit');
    // Let the group signal land on the grandchild.
    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(() => process.kill(grandchildPid, 0)).toThrow();
  }, 15_000);

  it('leaves the grandchild alone by default, so shared callers keep the old behavior', async () => {
    const child = spawn(
      process.execPath,
      [
        '-e',
        `const { spawn } = require('node:child_process');
         const grandchild = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000000)'], { stdio: 'ignore' });
         console.log(String(grandchild.pid));
         setInterval(() => {}, 1000000);`,
      ],
      { detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
    );

    const grandchildPid = await new Promise<number>((resolve) => {
      child.stdout?.once('data', (data: Buffer) =>
        resolve(Number.parseInt(data.toString('utf8').trim(), 10)),
      );
    });

    terminateChild(child, 50);
    await waitForEvent(child, 'exit');
    await new Promise((resolve) => setTimeout(resolve, 250));

    try {
      // Still running: opting out means the group is never signalled.
      expect(() => process.kill(grandchildPid, 0)).not.toThrow();
    } finally {
      process.kill(grandchildPid, 'SIGKILL');
    }
  }, 15_000);

  it('sweeps the group even when the direct child already exited cleanly', async () => {
    // The real shape of the cursor leak: the turn ends normally, the child
    // exits on its own, and the grandchild is still running. An early
    // no-op-if-exited return would skip the sweep and leak it every turn.
    const child = spawn(
      process.execPath,
      [
        '-e',
        `const { spawn } = require('node:child_process');
         const grandchild = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000000)'], { stdio: 'ignore' });
         // unref so THIS process can exit while the grandchild keeps running —
         // the shape cursor's worker-server leaves behind.
         grandchild.unref();
         console.log(String(grandchild.pid));`,
      ],
      { detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
    );

    // Attach the exit listener BEFORE awaiting stdout: this child exits
    // immediately after logging, so a listener added later would miss it.
    const exited = waitForEvent(child, 'exit');
    const grandchildPid = await new Promise<number>((resolve) => {
      child.stdout?.once('data', (data: Buffer) =>
        resolve(Number.parseInt(data.toString('utf8').trim(), 10)),
      );
    });
    // Let the parent exit on its own, as a completed turn does.
    await exited;
    expect(() => process.kill(grandchildPid, 0)).not.toThrow();

    terminateChild(child, 50, { processGroup: true });
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(() => process.kill(grandchildPid, 0)).toThrow();
  }, 15_000);

  it('still signals the direct child even when the group call cannot apply', async () => {
    // Not spawned detached, so there is no own group to signal.
    const child = spawnNode(
      `console.log('ready'); setInterval(() => {}, 1000000);`,
    );
    await waitForReady(child);

    terminateChild(child, 50, { processGroup: true });
    await waitForEvent(child, 'exit');

    expect(child.signalCode).not.toBeNull();
  }, 15_000);
});
