import type { FactoryProvider, ModuleMetadata } from '@nestjs/common';
import { NestjsThrottlerError } from './nestjs-throttler.error';

/**
 * Injection token for resolved {@link NestjsThrottlerModuleOptions} (including defaults).
 */
export const NESTJS_THROTTLER_MODULE_OPTIONS = `NESTJS_THROTTLER_MODULE_OPTIONS`;

/**
 * Default request limit per {@link DEFAULT_THROTTLER_TTL_MS} window.
 */
export const DEFAULT_THROTTLER_LIMIT = 1_000;

/**
 * Default sliding window in milliseconds.
 */
export const DEFAULT_THROTTLER_TTL_MS = 60_000;

/**
 * A single named throttler tier (e.g. anon vs auth, per-route bucket).
 */
export interface ThrottlerTierOptions {
  /** Maximum number of requests allowed within {@link ThrottlerTierOptions.ttl}. */
  readonly limit: number;
  /** Optional tier name (enables `@Throttle({ <name>: ... })` / `@SkipThrottle({ <name>: ... })`). */
  readonly name?: string | undefined;
  /** Sliding window in milliseconds. */
  readonly ttl: number;
}

/**
 * Static registration options for {@link NestjsThrottlerModule.forRoot}.
 */
export interface NestjsThrottlerModuleOptions {
  /** When true, register the dynamic module as global. */
  readonly isGlobal?: boolean | undefined;
  /**
   * One or more throttler tiers. Defaults to a single
   * {@link DEFAULT_THROTTLER_LIMIT}/{@link DEFAULT_THROTTLER_TTL_MS} tier when omitted.
   */
  readonly throttlers?: ReadonlyArray<ThrottlerTierOptions> | undefined;
}

/**
 * Async registration options for {@link NestjsThrottlerModule.forRootAsync}.
 */
export interface NestjsThrottlerModuleAsyncOptions {
  readonly imports?: ModuleMetadata['imports'];
  readonly inject?: FactoryProvider<NestjsThrottlerModuleOptions>['inject'];
  readonly isGlobal?: boolean | undefined;
  readonly useFactory: FactoryProvider<NestjsThrottlerModuleOptions>['useFactory'];
}

const DEFAULT_THROTTLERS: ReadonlyArray<ThrottlerTierOptions> = [
  {
    limit: DEFAULT_THROTTLER_LIMIT,
    ttl: DEFAULT_THROTTLER_TTL_MS,
  },
];

/**
 * Applies defaults for optional fields; does not validate (use {@link validateNestjsThrottlerModuleOptions}).
 */
export const applyNestjsThrottlerModuleDefaults = (
  options: NestjsThrottlerModuleOptions,
): Readonly<
  Required<Pick<NestjsThrottlerModuleOptions, 'throttlers'>> &
    NestjsThrottlerModuleOptions
> => ({
  ...options,
  throttlers:
    options.throttlers !== undefined && options.throttlers.length > 0
      ? options.throttlers
      : DEFAULT_THROTTLERS,
});

/**
 * Options after {@link applyNestjsThrottlerModuleDefaults}.
 */
export type ResolvedNestjsThrottlerModuleOptions = ReturnType<
  typeof applyNestjsThrottlerModuleDefaults
>;

const isPositiveInt = (n: number): boolean => Number.isInteger(n) && n > 0;

/** Type guard: a non-null object (matches the prior `typeof === 'object'` check). */
const isObjectValue = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Validates module options at bootstrap.
 * @throws NestjsThrottlerError when fields or numeric bounds are invalid.
 */
export function validateNestjsThrottlerModuleOptions(
  options: unknown,
): asserts options is NestjsThrottlerModuleOptions {
  if (options === null || options === undefined) {
    throw new NestjsThrottlerError(
      'NestjsThrottlerModuleOptions are required. Pass them to forRoot() or return them from forRootAsync().useFactory().',
    );
  }

  const throttlers = isObjectValue(options) ? options.throttlers : undefined;

  if (throttlers === undefined) {
    return;
  }

  if (!Array.isArray(throttlers) || throttlers.length === 0) {
    throw new NestjsThrottlerError(
      'throttlers, when provided, must be a non-empty array of { limit, ttl } tiers.',
    );
  }

  for (const tier of throttlers) {
    if (!isObjectValue(tier)) {
      throw new NestjsThrottlerError(
        'Each throttler tier must be an object with positive-integer limit and ttl.',
      );
    }

    if (typeof tier.limit !== 'number' || !isPositiveInt(tier.limit)) {
      throw new NestjsThrottlerError(
        'throttler tier "limit" must be a positive integer.',
      );
    }

    if (typeof tier.ttl !== 'number' || !isPositiveInt(tier.ttl)) {
      throw new NestjsThrottlerError(
        'throttler tier "ttl" must be a positive integer (milliseconds).',
      );
    }

    if (
      tier.name !== undefined &&
      (typeof tier.name !== 'string' || tier.name.trim() === '')
    ) {
      throw new NestjsThrottlerError(
        'throttler tier "name", when provided, must be a non-empty string.',
      );
    }
  }
}

/**
 * Validates then returns the same object reference as {@link NestjsThrottlerModuleOptions}.
 */
export const parseNestjsThrottlerModuleOptions = (
  input: unknown,
): NestjsThrottlerModuleOptions => {
  validateNestjsThrottlerModuleOptions(input);

  return input;
};
