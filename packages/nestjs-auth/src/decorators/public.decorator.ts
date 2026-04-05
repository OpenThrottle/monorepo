import { SetMetadata } from '@nestjs/common';

/** Metadata key for routes that skip JWT authentication. */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @description Marks a route as public (no JWT required). Use when you have a
 * global JwtAuthGuard but want to skip it for specific routes (e.g. login, health).
 *
 * @example
 * ```ts
 * @Public()
 * @Get('health')
 * health() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
