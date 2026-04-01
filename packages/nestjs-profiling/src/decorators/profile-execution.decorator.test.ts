import { describe, expect, it } from 'vitest';
import type { ProfileExecutionResult } from './profile-execution.types';
import { ProfileExecution } from './profile-execution.decorator';
import { setProfileExecutionReporter } from './profile-execution.reporter';

describe('ProfileExecution', () => {
  it('captures sync execution and notifies reporter', () => {
    const reports: ProfileExecutionResult[] = [];
    setProfileExecutionReporter((r) => reports.push(r));

    class TestClass {
      @ProfileExecution('sync-op')
      syncMethod(x: number, y: number): number {
        return x + y;
      }
    }

    const instance = new TestClass();
    const result = instance.syncMethod(2, 3);

    expect(result).toBe(5);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      inputs: [2, 3],
      label: 'sync-op',
      methodName: 'syncMethod',
      output: 5,
    });
    expect(reports[0]!.durationMs).toBeGreaterThanOrEqual(0);
    expect(reports[0]!.startTime).toBeLessThanOrEqual(reports[0]!.endTime);
    setProfileExecutionReporter(undefined);
  });

  it('captures async execution and notifies reporter', async () => {
    const reports: ProfileExecutionResult[] = [];
    setProfileExecutionReporter((r) => reports.push(r));

    class TestClass {
      @ProfileExecution('async-op')
      async asyncMethod(a: string): Promise<string> {
        return `hello-${a}`;
      }
    }

    const instance = new TestClass();
    const result = await instance.asyncMethod('world');

    expect(result).toBe('hello-world');
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      inputs: ['world'],
      label: 'async-op',
      methodName: 'asyncMethod',
      output: 'hello-world',
    });
    setProfileExecutionReporter(undefined);
  });

  it('uses method name as label when label is omitted', () => {
    const reports: ProfileExecutionResult[] = [];
    setProfileExecutionReporter((r) => reports.push(r));

    class TestClass {
      @ProfileExecution()
      unnamed(): number {
        return 42;
      }
    }

    const instance = new TestClass();
    instance.unnamed();

    expect(reports[0]!.label).toBe('unnamed');
    setProfileExecutionReporter(undefined);
  });

  it('captures sync throw and notifies reporter with error', () => {
    const reports: ProfileExecutionResult[] = [];
    setProfileExecutionReporter((r) => reports.push(r));

    class TestClass {
      @ProfileExecution('throws')
      syncThrow(): never {
        throw new Error('sync error');
      }
    }

    const instance = new TestClass();
    expect(() => instance.syncThrow()).toThrow('sync error');
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      error: { message: 'sync error', name: 'Error' },
      label: 'throws',
    });
    setProfileExecutionReporter(undefined);
  });

  it('captures async rejection and notifies reporter with error', async () => {
    const reports: ProfileExecutionResult[] = [];
    setProfileExecutionReporter((r) => reports.push(r));

    class TestClass {
      @ProfileExecution('async-throw')
      async asyncThrow(): Promise<never> {
        throw new Error('async error');
      }
    }

    const instance = new TestClass();
    await expect(instance.asyncThrow()).rejects.toThrow('async error');
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      error: { message: 'async error', name: 'Error' },
      label: 'async-throw',
    });
    setProfileExecutionReporter(undefined);
  });

  it('preserves method context (this)', () => {
    const reports: ProfileExecutionResult[] = [];
    setProfileExecutionReporter((r) => reports.push(r));

    class TestClass {
      value = 10;

      @ProfileExecution()
      getValue(): number {
        return this.value;
      }
    }

    const instance = new TestClass();
    const result = instance.getValue();

    expect(result).toBe(10);
    setProfileExecutionReporter(undefined);
  });
});
