import { describe, expect, it } from 'vitest';
import { setProfileExecutionReporter } from './profile-execution.reporter';
import type { ProfileExecutionResult } from './profile-execution.types';
import { profileExecution } from './profile-execution.util';

describe('profileExecution', () => {
  it('returns result and execution for sync fn', async () => {
    const { execution, result } = await profileExecution('sync-label', () => 42);
    expect(result).toBe(42);
    expect(execution.label).toBe('sync-label');
    expect(execution.output).toBe(42);
    expect(execution.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns result and execution for async fn', async () => {
    const { execution, result } = await profileExecution('async-label', async () => 'ok');
    expect(result).toBe('ok');
    expect(execution.label).toBe('async-label');
    expect(execution.output).toBe('ok');
  });

  it('accepts options.inputs and options.metadata', async () => {
    const { execution } = await profileExecution(
      'with-options',
      () => true,
      { inputs: [1, 2], metadata: { query: 'SELECT 1' } },
    );
    expect(execution.inputs).toEqual([1, 2]);
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
