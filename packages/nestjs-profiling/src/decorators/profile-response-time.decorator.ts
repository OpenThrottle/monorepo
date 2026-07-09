import { Logger } from '@nestjs/common';

const LOG_CONTEXT = 'ProfileResponseTime';

interface ReflectWithKeys {
  defineMetadata: (
    key: string | symbol,
    value: unknown,
    target: object,
    propertyKey?: string | symbol,
  ) => void;
  getMetadata: (
    key: string | symbol,
    target: object,
    propertyKey?: string | symbol,
  ) => unknown;
  getMetadataKeys: (
    target: object,
    propertyKey?: string | symbol,
  ) => (string | symbol)[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isReflectWithKeys = (value: unknown): value is ReflectWithKeys =>
  isRecord(value) &&
  typeof value['defineMetadata'] === 'function' &&
  typeof value['getMetadata'] === 'function' &&
  typeof value['getMetadataKeys'] === 'function';

function getReflectWithKeys(): ReflectWithKeys | undefined {
  const candidate: unknown =
    typeof Reflect === 'undefined' ? undefined : Reflect;

  return isReflectWithKeys(candidate) ? candidate : undefined;
}

/**
 * @description Copies Reflect metadata from the original method to the wrapper so NestJS
 * (and other decorator-based frameworks) still discover the wrapped handler.
 *
 * NestJS GraphQL/HTTP param decorators (`@Args`, `design:paramtypes`, route metadata) store
 * their metadata two ways: some on the function value itself, others keyed on the class
 * prototype for `propertyKey`. We copy both:
 *  - function-object metadata: original method value -> wrapper value, and
 *  - prototype-level metadata: prototype[propertyKey] mirrored onto the wrapper value,
 * so the metadata survives regardless of which location a framework reads.
 */
function copyMethodMetadata(
  prototype: object,
  propertyKey: string | symbol,
  source: (...args: unknown[]) => unknown,
  target: (...args: unknown[]) => unknown,
): void {
  const reflect = getReflectWithKeys();
  if (reflect === undefined) {
    return;
  }

  for (const key of reflect.getMetadataKeys(source)) {
    reflect.defineMetadata(key, reflect.getMetadata(key, source), target);
  }

  for (const key of reflect.getMetadataKeys(prototype, propertyKey)) {
    const value = reflect.getMetadata(key, prototype, propertyKey);
    reflect.defineMetadata(key, value, target);
    reflect.defineMetadata(key, value, prototype, propertyKey);
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
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor => {
    const originalMethod: (...args: unknown[]) => unknown = descriptor.value;
    const tag = label ?? String(propertyKey);

    const wrapper = function (this: unknown, ...args: unknown[]): unknown {
      const start = performance.now();
      const result = originalMethod.apply(this, args);

      const logElapsed = (): void => {
        try {
          const elapsedMs = performance.now() - start;
          logger.log(`[${tag}] ${elapsedMs.toFixed(2)}ms`);
        } catch {
          // Avoid logging failures rejecting the resolver promise
        }
      };

      if (result instanceof Promise) {
        return result.finally(logElapsed);
      }

      logElapsed();

      return result;
    };

    copyMethodMetadata(target, propertyKey, originalMethod, wrapper);
    descriptor.value = wrapper;

    return descriptor;
  };
}
