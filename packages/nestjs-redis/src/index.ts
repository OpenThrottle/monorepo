export { getRedisCache } from './config/redis/redis.utils';
export { NestjsRedisModule } from './nestjs-redis.module';
/**
 * @public
 * The shared, dedicated ioredis client provided by {@link NestjsRedisModule}
 * for control-plane work (health ping, plan-cancel pub/sub). See
 * {@link REDIS_CLIENT} for the injection token.
 */
export { createRedisClient } from './config/redis-client/redis-client.utils';
/** @public */
export { REDIS_CLIENT } from './modules/redis-client.token';
