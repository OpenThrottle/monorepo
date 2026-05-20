/**
 * Cache control for Apollo works uses the lowest possible maxAge in a given request.
 * If not given a defaultMaxAge, it'll default to 0. If any type or field requires a resolver and does not have a maxAge, it'll use the default, which is 0.
 * So there are two options here -
 * 1. Increase the defaultMaxAge of all requests and explicitly set maxAge of specific fields
 * 2. Set defaultMaxAge to 0 but explicitly set maxAge for all fields and types in a given request
 *
 *
 * @see https://github.com/apollographql/apollo-server/issues/3559
 * @see https://github.com/apollographql/apollo-server/issues/3559#issuecomment-737427790
 *
 */

import { KeyvAdapter } from '@apollo/utils.keyvadapter';
import { ErrorsAreMissesCache } from '@apollo/utils.keyvaluecache';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';
import { redisConfig } from './nestjs-redis.config';

/**
 * @see https://www.apollographql.com/docs/apollo-server/performance/cache-backends/#configuring-redis
 * @see https://www.apollographql.com/docs/apollo-server/performance/cache-backends/#handling-cache-fetching-errors
 * @description Simple helper function that connects to our Redis instance
 * and returns a KeyvAdapter instance which is used by Apollo Server.
 */
export const getRedisCache = () => {
  const APP_NAME = process.env.APP_NAME || 'openthrottle - default';
  const namespace = `${APP_NAME}-graphql-cache`;

  const { host, port } = redisConfig();
  const redisUri = `redis://${host}:${port}`;

  const cacheRedis = new KeyvRedis(redisUri, { namespace });
  const cacheKV = new Keyv(cacheRedis);

  const adapter = new KeyvAdapter(cacheKV);
  const faultTolerantCache = new ErrorsAreMissesCache(adapter);

  // return new KeyvAdapter(redisCache);

  return faultTolerantCache;
};
