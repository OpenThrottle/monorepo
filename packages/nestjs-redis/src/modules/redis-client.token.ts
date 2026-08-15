/**
 * @description Nest DI token for the shared, dedicated ioredis client provided
 * by {@link NestjsRedisModule}. Inject with
 * `@Inject(REDIS_CLIENT) private readonly redis: Redis | null` — the value is
 * `null` when `REDIS_HOST` is unset (see {@link createRedisClient}).
 */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
