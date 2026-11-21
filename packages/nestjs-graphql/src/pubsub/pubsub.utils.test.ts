import { PubSub } from 'graphql-subscriptions';
import { Redis } from 'ioredis';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPubSub, resolvePubSubChannelPrefix } from './pubsub.utils.ts';
import { RedisPubSubEngine } from './redis-pubsub-engine.strategy.ts';

describe('createPubSub', () => {
  describe('when Redis is not configured', () => {
    it('builds the in-memory PubSub', () => {
      const engine = createPubSub({
        channelPrefix: 'gql:',
        logger: undefined,
        redis: null,
      });

      expect(engine).toBeInstanceOf(PubSub);
    });

    it('builds a fresh instance per call (factory is not a singleton itself)', () => {
      const options = { channelPrefix: 'gql:', logger: undefined, redis: null };

      expect(createPubSub(options)).not.toBe(createPubSub(options));
    });
  });

  describe('when Redis is configured', () => {
    it('builds a RedisPubSubEngine on a duplicated subscriber connection', () => {
      // lazyConnect: constructing the clients opens no socket.
      const redis = new Redis({ lazyConnect: true });
      const duplicate = vi.spyOn(redis, 'duplicate');

      const engine = createPubSub({
        channelPrefix: 'gql:',
        logger: undefined,
        redis,
      });

      expect(engine).toBeInstanceOf(RedisPubSubEngine);
      expect(duplicate).toHaveBeenCalledOnce();

      redis.disconnect();
      const subscriber: unknown = duplicate.mock.results[0]?.value;
      if (subscriber instanceof Redis) {
        subscriber.disconnect();
      }
    });
  });
});

describe('resolvePubSubChannelPrefix', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to the gql namespace', () => {
    vi.stubEnv('OT_PUBSUB_PREFIX', '');
    vi.stubEnv('OT_CONTAINER_PREFIX', '');

    expect(resolvePubSubChannelPrefix()).toBe('gql:');
  });

  it('scopes a worktree by its container prefix', () => {
    vi.stubEnv('OT_PUBSUB_PREFIX', '');
    vi.stubEnv('OT_CONTAINER_PREFIX', 'wt-feature-x-');

    expect(resolvePubSubChannelPrefix()).toBe('gql:wt-feature-x:');
  });

  it('honors the explicit override', () => {
    vi.stubEnv('OT_PUBSUB_PREFIX', 'custom:');
    vi.stubEnv('OT_CONTAINER_PREFIX', 'wt-feature-x-');

    expect(resolvePubSubChannelPrefix()).toBe('custom:');
  });
});
