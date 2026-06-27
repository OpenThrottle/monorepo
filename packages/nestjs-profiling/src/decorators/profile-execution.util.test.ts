import { describe, expect, it, vi } from 'vitest';
import { setProfileExecutionReporter } from './profile-execution.reporter';
import type { ProfileExecutionResult } from './profile-execution.types';
import { profileExecution } from './profile-execution.util';

describe('profileExecution', () => {
  it('returns result and does not capture output by default', async () => {
    const { execution, result } = await profileExecution(
      'sync-label',
      () => 42,
    );
    expect(result).toBe(42);
    expect(execution.label).toBe('sync-label');
    expect(execution.output).toBeUndefined();
    expect(execution.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns result and execution for async fn', async () => {
    const { execution, result } = await profileExecution(
      'async-label',
      async () => 'ok',
    );
    expect(result).toBe('ok');
    expect(execution.label).toBe('async-label');
    expect(execution.output).toBeUndefined();
  });

  it('captures output only when captureOutput is enabled', async () => {
    const { execution } = await profileExecution('captured', () => 42, {
      captureOutput: true,
    });
    expect(execution.output).toBe(42);
  });

  it('includes the output key for a nullish result when capture is on', async () => {
    const { execution } = await profileExecution('nullish', () => undefined, {
      captureOutput: true,
    });
    // Capture-on must produce an explicit `output` key (here `undefined`) so it
    // is distinguishable from capture-off, where the key is absent entirely.
    expect('output' in execution).toBe(true);
    expect(execution.output).toBeUndefined();
  });

  it('does not capture inputs unless captureInputs is enabled', async () => {
    const { execution } = await profileExecution('no-inputs', () => true, {
      inputs: [1, 2],
      metadata: { query: 'SELECT 1' },
    });
    expect(execution.inputs).toBeUndefined();
    expect(execution.metadata).toEqual({ query: 'SELECT 1' });
  });

  it('captures and redacts inputs/output when enabled', async () => {
    const { execution } = await profileExecution(
      'with-options',
      () => ({ token: 'abc', value: 1 }),
      {
        captureInputs: true,
        captureOutput: true,
        inputs: [{ password: 'p', userId: 7 }],
        metadata: { query: 'SELECT 1' },
      },
    );
    expect(execution.inputs).toEqual([{ password: '[REDACTED]', userId: 7 }]);
    expect(execution.output).toEqual({ token: '[REDACTED]', value: 1 });
    expect(execution.metadata).toEqual({ query: 'SELECT 1' });
  });

  it('notifies reporter when set', async () => {
    const reports: ProfileExecutionResult[] = [];
    setProfileExecutionReporter((r) => reports.push(r));
    await profileExecution('reporter-test', () => 'x');
    expect(reports).toHaveLength(1);
    expect(reports[0]!.label).toBe('reporter-test');
    setProfileExecutionReporter(undefined);
  });

  it('is a no-op reporter path with no reporter set (returns result, notifies nothing)', async () => {
    setProfileExecutionReporter(undefined);

    // Spy through a temporarily-set reporter to prove it is never invoked once we
    // clear it: register, clear, then run. The reporter must not be called.
    const reporter = vi.fn();
    setProfileExecutionReporter(reporter);
    setProfileExecutionReporter(undefined);

    const payload = { marker: 'large-result' };
    const { result } = await profileExecution('no-reporter', () => payload, {
      captureInputs: true,
      captureOutput: true,
      inputs: [{ a: 1 }],
    });

    // Result flows through unchanged and no reporter was notified.
    expect(result).toBe(payload);
    expect(reporter).not.toHaveBeenCalled();
  });

  it('rethrows and reports error on sync throw', async () => {
    const reports: ProfileExecutionResult[] = [];
    setProfileExecutionReporter((r) => reports.push(r));
    await expect(
      profileExecution('throw-sync', () => {
        throw new Error('sync throw');
      }),
    ).rejects.toThrow('sync throw');
    expect(reports).toHaveLength(1);
    expect(reports[0]!.error).toMatchObject({ message: 'sync throw' });
    setProfileExecutionReporter(undefined);
  });

  it('rethrows and reports error on async rejection', async () => {
    const reports: ProfileExecutionResult[] = [];
    setProfileExecutionReporter((r) => reports.push(r));
    await expect(
      profileExecution('throw-async', async () => {
        throw new Error('async throw');
      }),
    ).rejects.toThrow('async throw');
    expect(reports).toHaveLength(1);
    expect(reports[0]!.error).toMatchObject({ message: 'async throw' });
    setProfileExecutionReporter(undefined);
  });
});
