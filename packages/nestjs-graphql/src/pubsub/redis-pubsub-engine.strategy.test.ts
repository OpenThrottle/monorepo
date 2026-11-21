import { describe, expect, it, vi } from 'vitest';

import type {
  PubSubLogger,
  PubSubRedisPublisher,
  PubSubRedisSubscriber,
} from './pubsub.types.ts';
import { RedisPubSubEngine } from './redis-pubsub-engine.strategy.ts';

type Listener = (channel: string, message: string) => void;

/**
 * An in-memory stand-in for one Redis server: every engine built on it is a
 * separate "process", and only the bus connects them — as Redis does.
 */
class FakeRedisBus {
  readonly subscribeCalls: string[] = [];
  readonly unsubscribeCalls: string[] = [];
  private readonly connections: {
    readonly channels: Set<string>;
    readonly listeners: Listener[];
  }[] = [];

  publisher(): PubSubRedisPublisher {
    return {
      publish: async (channel: string, message: string): Promise<number> => {
        const receivers = this.connections.filter((connection) => {
          return connection.channels.has(channel);
        });
        for (const connection of receivers) {
          for (const listener of connection.listeners) {
            listener(channel, message);
          }
        }

        return receivers.length;
      },
      quit: async (): Promise<string> => {
        return 'OK';
      },
    };
  }

  subscriber(): PubSubRedisSubscriber {
    const connection = {
      channels: new Set<string>(),
      listeners: new Array<Listener>(),
    };
    this.connections.push(connection);

    return {
      on: (_event: 'message', listener: Listener): void => {
        connection.listeners.push(listener);
      },
      quit: async (): Promise<string> => {
        return 'OK';
      },
      subscribe: async (channel: string): Promise<number> => {
        this.subscribeCalls.push(channel);
        connection.channels.add(channel);

        return connection.channels.size;
      },
      unsubscribe: async (channel: string): Promise<number> => {
        this.unsubscribeCalls.push(channel);
        connection.channels.delete(channel);

        return connection.channels.size;
      },
    };
  }
}

const createLogger = (): PubSubLogger => {
  return { error: vi.fn(), warn: vi.fn() };
};

const createEngine = (
  bus: FakeRedisBus,
  logger: PubSubLogger | undefined = undefined,
): RedisPubSubEngine => {
  return new RedisPubSubEngine({
    channelPrefix: 'gql:test:',
    logger,
    publisher: bus.publisher(),
    subscriber: bus.subscriber(),
  });
};

describe('RedisPubSubEngine', () => {
  it('delivers an event published by one process to a subscriber in another', async () => {
    const bus = new FakeRedisBus();
    const worker = createEngine(bus);
    const api = createEngine(bus);
    const onMessage = vi.fn();
    const createdAt = new Date('2026-11-20T00:00:00.000Z');

    await api.subscribe('plan:abc:lifecycle', onMessage);
    await worker.publish('plan:abc:lifecycle', {
      event: { createdAt, event: 'plan.status_changed', planId: 'abc' },
    });

    expect(onMessage).toHaveBeenCalledWith({
      event: { createdAt, event: 'plan.status_changed', planId: 'abc' },
    });
  });

  it('prefixes the Redis channel and keeps the topic name intact', async () => {
    const bus = new FakeRedisBus();
    const engine = createEngine(bus);

    await engine.subscribe('notifications:firehose', vi.fn());

    expect(bus.subscribeCalls).toEqual(['gql:test:notifications:firehose']);
  });

  it('works with the asyncIterableIterator the GraphQL resolvers use', async () => {
    const bus = new FakeRedisBus();
    const api = createEngine(bus);
    const worker = createEngine(bus);
    const iterator = api.asyncIterableIterator<{ readonly n: number }>(
      'plan:abc:lifecycle',
    );

    const next = iterator.next();
    // The iterator subscribes lazily on the first `next()`; let it settle.
    await vi.waitFor(() => {
      expect(bus.subscribeCalls).toHaveLength(1);
    });
    await worker.publish('plan:abc:lifecycle', { n: 1 });

    await expect(next).resolves.toEqual({ done: false, value: { n: 1 } });
    await iterator.return?.();
  });

  describe('subscription bookkeeping', () => {
    it('issues one Redis SUBSCRIBE per channel and fans out locally', async () => {
      const bus = new FakeRedisBus();
      const api = createEngine(bus);
      const worker = createEngine(bus);
      const first = vi.fn();
      const second = vi.fn();

      await api.subscribe('topic', first);
      await api.subscribe('topic', second);
      await worker.publish('topic', { ok: true });

      expect(bus.subscribeCalls).toEqual(['gql:test:topic']);
      expect(first).toHaveBeenCalledOnce();
      expect(second).toHaveBeenCalledOnce();
    });

    it('unsubscribes from Redis only when the last local handler leaves', async () => {
      const bus = new FakeRedisBus();
      const engine = createEngine(bus);
      const first = await engine.subscribe('topic', vi.fn());
      const second = await engine.subscribe('topic', vi.fn());

      engine.unsubscribe(first);
      expect(bus.unsubscribeCalls).toEqual([]);

      engine.unsubscribe(second);
      expect(bus.unsubscribeCalls).toEqual(['gql:test:topic']);
    });

    it('ignores an unknown subscription id', () => {
      const engine = createEngine(new FakeRedisBus());

      expect(() => {
        engine.unsubscribe(999);
      }).not.toThrow();
    });

    it('stops delivering to an unsubscribed handler', async () => {
      const bus = new FakeRedisBus();
      const api = createEngine(bus);
      const worker = createEngine(bus);
      const onMessage = vi.fn();
      const id = await api.subscribe('topic', onMessage);

      api.unsubscribe(id);
      await worker.publish('topic', { ok: true });

      expect(onMessage).not.toHaveBeenCalled();
    });

    it('rolls back a failed SUBSCRIBE so the next subscriber retries', async () => {
      const bus = new FakeRedisBus();
      const subscriber = bus.subscriber();
      const subscribe = vi
        .fn<(channel: string) => Promise<unknown>>()
        .mockRejectedValueOnce(new Error('connection lost'))
        .mockResolvedValue(1);
      const engine = new RedisPubSubEngine({
        channelPrefix: 'gql:',
        logger: undefined,
        publisher: bus.publisher(),
        subscriber: { ...subscriber, subscribe },
      });

      await expect(engine.subscribe('topic', vi.fn())).rejects.toThrow(
        'connection lost',
      );
      await engine.subscribe('topic', vi.fn());

      expect(subscribe).toHaveBeenCalledTimes(2);
    });
  });

  describe('failure handling', () => {
    it('logs and resolves when a publish fails', async () => {
      const logger = createLogger();
      const engine = new RedisPubSubEngine({
        channelPrefix: 'gql:',
        logger,
        publisher: {
          publish: async (): Promise<number> => {
            throw new Error('redis down');
          },
          quit: async (): Promise<string> => {
            return 'OK';
          },
        },
        subscriber: new FakeRedisBus().subscriber(),
      });

      await expect(engine.publish('topic', {})).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('redis down'),
      );
    });

    it('logs and resolves when the payload cannot be serialized', async () => {
      const logger = createLogger();
      const engine = createEngine(new FakeRedisBus(), logger);

      await expect(
        engine.publish('topic', { big: BigInt(1) }),
      ).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledOnce();
    });

    it('drops and logs an undecodable message', async () => {
      const bus = new FakeRedisBus();
      const logger = createLogger();
      const engine = createEngine(bus, logger);
      const onMessage = vi.fn();

      await engine.subscribe('topic', onMessage);
      await bus.publisher().publish('gql:test:topic', '{not json');

      expect(onMessage).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledOnce();
    });

    it('closes both connections and logs a failed quit', async () => {
      const logger = createLogger();
      const quit = vi.fn(async (): Promise<string> => {
        return 'OK';
      });
      const engine = new RedisPubSubEngine({
        channelPrefix: 'gql:',
        logger,
        publisher: { publish: vi.fn(), quit },
        subscriber: {
          ...new FakeRedisBus().subscriber(),
          quit: async (): Promise<string> => {
            throw new Error('already closed');
          },
        },
      });

      await engine.close();

      expect(quit).toHaveBeenCalledOnce();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('already closed'),
      );
    });
  });
});
