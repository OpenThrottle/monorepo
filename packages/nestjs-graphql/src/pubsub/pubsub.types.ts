import type { Redis } from 'ioredis';

/**
 * @description Minimal logging surface the Redis engine reports through. Matches
 * the injectable `LoggerService` from `@openthrottle/nestjs-modules` and Nest's
 * built-in `Logger`.
 *
 * @public
 */
export interface PubSubLogger {
  readonly error: (message: unknown, ...optionalParams: unknown[]) => void;
  readonly warn: (message: unknown, ...optionalParams: unknown[]) => void;
}

/**
 * @description Inputs to {@link createPubSub}. `redis: null` (Redis unconfigured,
 * or a test) selects the in-memory engine.
 *
 * @public
 */
export interface CreatePubSubOptions {
  /** Prepended to every topic to form the Redis channel name. */
  readonly channelPrefix: string;
  readonly logger: PubSubLogger | undefined;
  /** The publisher connection; the engine duplicates it for subscriber mode. */
  readonly redis: Redis | null;
}

/**
 * @description The slice of an ioredis connection the engine publishes on.
 *
 * @public
 */
export interface PubSubRedisPublisher {
  readonly publish: (channel: string, message: string) => Promise<number>;
  readonly quit: () => Promise<unknown>;
}

/**
 * @description The slice of an ioredis connection the engine holds in
 * subscriber mode.
 *
 * @public
 */
export interface PubSubRedisSubscriber {
  readonly on: (
    event: 'message',
    listener: (channel: string, message: string) => void,
  ) => unknown;
  readonly quit: () => Promise<unknown>;
  readonly subscribe: (channel: string) => Promise<unknown>;
  readonly unsubscribe: (channel: string) => Promise<unknown>;
}

/**
 * @description Constructor inputs of the Redis-backed engine. Structural, so an
 * ioredis `Redis` fits and a test can pass an in-memory bus.
 *
 * @public
 */
export interface RedisPubSubEngineOptions {
  readonly channelPrefix: string;
  readonly logger: PubSubLogger | undefined;
  readonly publisher: PubSubRedisPublisher;
  /** A connection reserved for subscriber mode — Redis forbids other commands on it. */
  readonly subscriber: PubSubRedisSubscriber;
}
