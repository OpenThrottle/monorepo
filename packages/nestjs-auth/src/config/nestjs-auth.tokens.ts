import type { NestjsAuthOptions } from './nestjs-auth.options';

/**
 * @description Typed DI token for {@link NestjsAuthOptions}. Prefer this `symbol`
 * over the historical string token `'NESTJS_AUTH_OPTIONS'`: symbols cannot collide
 * across modules and are exported so consumers can inject or override the resolved
 * options. The provided value is `NestjsAuthOptions | null` (null when registered
 * via `forRoot()` with no static options).
 *
 * @example
 * ```ts
 * @Injectable()
 * class MyAuthService {
 *   constructor(@Inject(NESTJS_AUTH_OPTIONS) private readonly options: NestjsAuthOptions | null) {}
 * }
 * ```
 */
export const NESTJS_AUTH_OPTIONS: unique symbol = Symbol('NESTJS_AUTH_OPTIONS');

/** Type of the value provided under {@link NESTJS_AUTH_OPTIONS}. */
export type NestjsAuthOptionsToken = NestjsAuthOptions | null;
