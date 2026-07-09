import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ProfileResponseTime } from './profile-response-time.decorator';

// Mirrors how NestJS GraphQL/HTTP param decorators (`@Args`, `design:paramtypes`,
// route metadata) store metadata: a key on the method function value and a key on the
// class prototype for `propertyKey`. The decorator must copy both onto the wrapper so
// the handler stays discoverable after wrapping.
const FUNCTION_META_KEY = 'design:paramtypes';
const PROTOTYPE_META_KEY = '__routeArguments__';

const isFunction = (value: unknown): value is (...args: unknown[]) => unknown =>
  typeof value === 'function';

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

  it('preserves NestJS @Args/param metadata on the wrapped handler', () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});

    const functionMeta = [String, Number];
    const prototypeMeta = { '0': { index: 0, type: 'args' } };

    // A param-like decorator that seeds metadata exactly where NestJS would, in both
    // locations. Stacked *below* @ProfileResponseTime so it runs first (decorators
    // evaluate bottom-up) and the metadata exists before the profiling wrapper copies it.
    const SeedMetadata = (): MethodDecorator => {
      return (target, propertyKey, descriptor): void => {
        const original = descriptor.value;
        if (isFunction(original)) {
          Reflect.defineMetadata(FUNCTION_META_KEY, functionMeta, original);
        }
        Reflect.defineMetadata(
          PROTOTYPE_META_KEY,
          prototypeMeta,
          target,
          propertyKey,
        );
      };
    };

    class TestClass {
      @ProfileResponseTime('with-args')
      @SeedMetadata()
      resolveThing(_id: string, _count: number): string {
        return 'resolved';
      }
    }

    const wrapped: object = TestClass.prototype.resolveThing;

    // Function-object metadata copied from the original method onto the wrapper.
    expect(Reflect.getMetadata(FUNCTION_META_KEY, wrapped)).toEqual(
      functionMeta,
    );

    // Prototype-level metadata mirrored onto both the wrapper value and the prototype,
    // so a framework reading either location still finds the param metadata.
    expect(Reflect.getMetadata(FUNCTION_META_KEY, wrapped)).toBeDefined();
    expect(
      Reflect.getMetadata(
        PROTOTYPE_META_KEY,
        TestClass.prototype,
        'resolveThing',
      ),
    ).toEqual(prototypeMeta);

    // The wrapped method still runs correctly.
    expect(new TestClass().resolveThing('x', 1)).toBe('resolved');
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
