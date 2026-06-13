import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ProfileResponseTime } from './profile-response-time.decorator';

describe('ProfileResponseTime', () => {
  it('measures and reports sync method execution time', () => {
    const logSpy = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {});

    class TestClass {
      @ProfileResponseTime('sync-op')
      syncMethod(): string {
        return 'done';
      }
    }

    const instance = new TestClass();
    const result = instance.syncMethod();

    expect(result).toBe('done');
    expect(logSpy).toHaveBeenCalled();
    const call = logSpy.mock.calls[0];
    expect(call?.[0]).toMatch(/\[sync-op\].*ms/);
    logSpy.mockRestore();
  });

  it('measures and reports async method execution time', async () => {
    const logSpy = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {});

    class TestClass {
      @ProfileResponseTime('async-op')
      async asyncMethod(): Promise<string> {
        return 'async-done';
      }
    }

    const instance = new TestClass();
    const result = await instance.asyncMethod();

    expect(result).toBe('async-done');
    expect(logSpy).toHaveBeenCalled();
    const call = logSpy.mock.calls[0];
    expect(call?.[0]).toMatch(/\[async-op\].*ms/);
    logSpy.mockRestore();
  });

  it('uses method name as tag when label is omitted', () => {
    const logSpy = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {});

    class TestClass {
      @ProfileResponseTime()
      unnamed(): number {
        return 42;
      }
    }

    const instance = new TestClass();
    instance.unnamed();

    expect(logSpy).toHaveBeenCalled();
    const call = logSpy.mock.calls[0];
    expect(call?.[0]).toMatch(/\[unnamed\].*ms/);
    logSpy.mockRestore();
  });

  it('preserves method context (this)', () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    class TestClass {
      value = 10;

      @ProfileResponseTime()
      getValue(): number {
        return this.value;
      }
    }

    const instance = new TestClass();
    const result = instance.getValue();

    expect(result).toBe(10);
  });
});
