import type { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { escalateKill, SIGKILL_GRACE_MS } from '../child-kill.ts';

/** Minimal fake ChildProcess: an EventEmitter with kill()/killed, matching what escalateKill touches. */
class FakeChildProcess extends EventEmitter {
  killed = false;
  readonly kill = vi.fn((_signal?: NodeJS.Signals | number): boolean => true);
}

function asChildProcess(fake: FakeChildProcess): ChildProcess {
  // FakeChildProcess deliberately implements only the subset of ChildProcess that
  // escalateKill touches (kill, killed, the 'close' event via EventEmitter).
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return fake as unknown as ChildProcess;
}

describe('escalateKill', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('is a no-op when the child has already exited', () => {
    const fake = new FakeChildProcess();
    fake.killed = true;

    escalateKill(asChildProcess(fake));

    expect(fake.kill).not.toHaveBeenCalled();
  });

  it('sends SIGTERM immediately for a live child', () => {
    const fake = new FakeChildProcess();

    escalateKill(asChildProcess(fake));

    expect(fake.kill).toHaveBeenCalledTimes(1);
    expect(fake.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('escalates to SIGKILL after the grace period if the child has not closed', () => {
    const fake = new FakeChildProcess();

    escalateKill(asChildProcess(fake));
    vi.advanceTimersByTime(SIGKILL_GRACE_MS);

    expect(fake.kill).toHaveBeenCalledTimes(2);
    expect(fake.kill).toHaveBeenNthCalledWith(1, 'SIGTERM');
    expect(fake.kill).toHaveBeenNthCalledWith(2, 'SIGKILL');
  });

  it('clears the SIGKILL timer when the child closes before the grace period elapses', () => {
    const fake = new FakeChildProcess();

    escalateKill(asChildProcess(fake));
    // Simulate the child closing right after SIGTERM.
    fake.emit('close');
    vi.advanceTimersByTime(SIGKILL_GRACE_MS);

    // Only the initial SIGTERM should have fired; the SIGKILL timer was cleared.
    expect(fake.kill).toHaveBeenCalledTimes(1);
    expect(fake.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('swallows an error thrown by the SIGKILL send (child exited between timer and signal)', () => {
    const fake = new FakeChildProcess();
    fake.kill.mockImplementation((signal?: NodeJS.Signals | number) => {
      if (signal === 'SIGKILL') {
        throw new Error('ESRCH: no such process');
      }
      return true;
    });

    expect(() => {
      escalateKill(asChildProcess(fake));
      vi.advanceTimersByTime(SIGKILL_GRACE_MS);
    }).not.toThrow();

    expect(fake.kill).toHaveBeenCalledTimes(2);
  });
});
