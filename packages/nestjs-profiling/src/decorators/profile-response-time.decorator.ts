import { Logger } from '@nestjs/common';

const LOG_CONTEXT = 'ProfileResponseTime';

/**
 * @description Copies Reflect metadata from source to target so NestJS (and other decorator-based frameworks) still discover the wrapped method.
 */
function copyMethodMetadata(
  source: (...args: unknown[]) => unknown,
  target: (...args: unknown[]) => unknown,
): void {
  if (
    typeof Reflect === 'undefined' ||
    typeof (Reflect as { getMetadataKeys?: (t: object) => (string | symbol)[] })
      .getMetadataKeys !== 'function'
  ) {
    return;
  }

  const ReflectWithKeys = Reflect as {
    getMetadataKeys: (t: object) => (string | symbol)[];
    getMetadata: (key: string | symbol, t: object) => unknown;
    defineMetadata: (key: string | symbol, value: unknown, t: object) => void;
  };

  const keys = ReflectWithKeys.getMetadataKeys(source);
  for (const key of keys) {
    const value = ReflectWithKeys.getMetadata(key, source);
    ReflectWithKeys.defineMetadata(key, value, target);
  }
}

/**
 * @description Measures and logs how long a method takes. Supports both sync and async methods.
 * Optional label/tag is included in the log message for identification.
 * Preserves Reflect metadata so NestJS GraphQL/HTTP still discovers the handler.
 */
export function ProfileResponseTime(label?: string): MethodDecorator {
  const logger = new Logger(LOG_CONTEXT);

  return (
    _target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
    const tag = label ?? String(propertyKey);

    const wrapper = function (this: unknown, ...args: unknown[]): unknown {
      const start = performance.now();
      const result = originalMethod.apply(this, args) as
        | Promise<unknown>
        | unknown;

      const logElapsed = (): void => {
        try {
          const elapsedMs = performance.now() - start;
          logger.log(`[${tag}] ${elapsedMs.toFixed(2)}ms`);
        } catch {
          // Avoid logging failures rejecting the resolver promise
        }
      };

      if (result instanceof Promise) {
        return result.finally(logElapsed) as Promise<unknown>;
      }

      logElapsed();

      return result;
    };

    copyMethodMetadata(originalMethod, wrapper);
    descriptor.value = wrapper;

    return descriptor;
  };
}
