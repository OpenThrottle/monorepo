import { describe, expect, it, vi } from 'vitest';
import type { ProfileExecutionResult } from './profile-execution.types';
import { ProfileExecution } from './profile-execution.decorator';
import { setProfileExecutionReporter } from './profile-execution.reporter';

describe('ProfileExecution', () => {
  it('does not capture inputs/output by default', () => {
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
      label: 'sync-op',
      methodName: 'syncMethod',
    });
    expect(reports[0]!.inputs).toBeUndefined();
    expect(reports[0]!.output).toBeUndefined();
    expect(reports[0]!.durationMs).toBeGreaterThanOrEqual(0);
    expect(reports[0]!.startTime).toBeLessThanOrEqual(reports[0]!.endTime);
    setProfileExecutionReporter(undefined);
  });

  it('captures sync execution when capture flags are enabled', () => {
    const reports: ProfileExecutionResult[] = [];
    setProfileExecutionReporter((r) => reports.push(r));

    class TestClass {
      @ProfileExecution({
        captureInputs: true,
        captureOutput: true,
        label: 'sync-op',
      })
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
    setProfileExecutionReporter(undefined);
  });

  it('captures async execution when capture flags are enabled', async () => {
    const reports: ProfileExecutionResult[] = [];
    setProfileExecutionReporter((r) => reports.push(r));

    class TestClass {
      @ProfileExecution({
        captureInputs: true,
        captureOutput: true,
        label: 'async-op',
      })
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

  it('redacts sensitive keys in captured inputs and output', () => {
    const reports: ProfileExecutionResult[] = [];
    setProfileExecutionReporter((r) => reports.push(r));

    class TestClass {
      @ProfileExecution({ captureInputs: true, captureOutput: true })
      createUser(_input: { email: string; name: string; password: string }): {
        id: string;
        token: string;
      } {
        return { id: '1', token: 'super-secret' };
      }
    }

    const instance = new TestClass();
    instance.createUser({
      email: 'a@b.com',
      name: 'Ada',
      password: 'hunter2',
    });

    expect(reports).toHaveLength(1);
    expect(reports[0]!.inputs).toEqual([
      { email: '[REDACTED]', name: 'Ada', password: '[REDACTED]' },
    ]);
    expect(reports[0]!.output).toEqual({ id: '1', token: '[REDACTED]' });
    setProfileExecutionReporter(undefined);
  });

  it('includes the output key for a nullish return when capture is on', () => {
    const reports: ProfileExecutionResult[] = [];
    setProfileExecutionReporter((r) => reports.push(r));

    class TestClass {
      @ProfileExecution({ captureOutput: true, label: 'returns-undefined' })
      returnsUndefined(): undefined {
        return undefined;
      }
    }

    const instance = new TestClass();
    instance.returnsUndefined();

    expect(reports).toHaveLength(1);
    // Capture-on must produce an explicit `output` key (here `undefined`) so it
    // is distinguishable from capture-off, where the key is absent entirely.
    expect('output' in reports[0]!).toBe(true);
    expect(reports[0]!.output).toBeUndefined();
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

  it('passes async output through unchanged when no reporter is registered', async () => {
    setProfileExecutionReporter(undefined);

    const payload = { marker: 'large-result' };

    class TestClass {
      @ProfileExecution({ captureOutput: true, label: 'no-reporter' })
      async asyncMethod(): Promise<unknown> {
        return payload;
      }
    }

    const instance = new TestClass();
    const result = await instance.asyncMethod();

    // With no reporter registered the resolved value must flow through unchanged
    // (the decorator must not swallow or replace it on the zero-config path).
    expect(result).toBe(payload);
    setProfileExecutionReporter(undefined);
  });

  it('does not notify when no reporter is registered', async () => {
    setProfileExecutionReporter(undefined);

    class TestClass {
      @ProfileExecution({ captureInputs: true, captureOutput: true })
      async asyncMethod(value: string): Promise<string> {
        return value;
      }
    }

    const instance = new TestClass();
    await expect(instance.asyncMethod('ok')).resolves.toBe('ok');
  });

  it('is near-no-op with no reporter: skips redaction/capture work entirely', async () => {
    setProfileExecutionReporter(undefined);

    // A custom redactor lets us prove the decorator does NOT do per-call capture
    // work (the P1 overhead guard) when there is no reporter to consume it.
    const redactor = vi.fn((value: unknown) => value);

    class TestClass {
      @ProfileExecution({
        captureInputs: true,
        captureOutput: true,
        label: 'no-reporter-overhead',
        redactor,
      })
      syncMethod(x: number, y: number): number {
        return x + y;
      }

      @ProfileExecution({
        captureInputs: true,
        captureOutput: true,
        label: 'no-reporter-overhead-async',
        redactor,
      })
      async asyncMethod(value: string): Promise<string> {
        return value;
      }
    }

    const instance = new TestClass();
    expect(instance.syncMethod(2, 3)).toBe(5);
    await expect(instance.asyncMethod('ok')).resolves.toBe('ok');

    // The expensive path (redacting inputs/output) must never run without a reporter.
    expect(redactor).not.toHaveBeenCalled();
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
