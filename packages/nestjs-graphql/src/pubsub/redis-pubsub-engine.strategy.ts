import { toErrorMessage } from '@openthrottle/nodejs-utils';
import { PubSubEngine } from 'graphql-subscriptions';

import {
  decodePubSubPayload,
  encodePubSubPayload,
} from './payload-codec/payload-codec.utils.ts';
import type {
  PubSubLogger,
  PubSubRedisPublisher,
  PubSubRedisSubscriber,
  RedisPubSubEngineOptions,
} from './pubsub.types.ts';

type MessageHandler = (payload: unknown) => void;

type DecodeResult =
  { readonly ok: false } | { readonly ok: true; readonly payload: unknown };

interface Subscription {
  readonly channel: string;
  readonly onMessage: MessageHandler;
}

/**
 * @description A {@link PubSubEngine} over Redis pub/sub, so an event published
 * by one server process (a `PROCESS_ROLE=worker`, another API replica) reaches
 * websocket subscribers on every other process sharing the Redis.
 *
 * One Redis SUBSCRIBE per channel, however many GraphQL subscriptions listen on
 * it: the engine fans a message out to its local handlers itself, and
 * unsubscribes from Redis when the last local handler leaves. ioredis
 * re-subscribes on reconnect.
 *
 * `publish` never rejects — the in-memory engine cannot fail, and several
 * callers fire it with `void`, where a rejection would be unhandled. A failed
 * publish is logged and the event is dropped; subscribers fall back to their
 * next reload, the same as any missed live update.
 *
 * @public
 */
export class RedisPubSubEngine extends PubSubEngine {
  private readonly channelPrefix: string;
  private readonly channels = new Map<string, Set<number>>();
  private readonly logger: PubSubLogger | undefined;
  private nextSubscriptionId = 0;
  private readonly publisher: PubSubRedisPublisher;
  private readonly subscriber: PubSubRedisSubscriber;
  private readonly subscriptions = new Map<number, Subscription>();

  constructor(options: RedisPubSubEngineOptions) {
    super();
    this.channelPrefix = options.channelPrefix;
    this.logger = options.logger;
    this.publisher = options.publisher;
    this.subscriber = options.subscriber;

    this.subscriber.on('message', (channel: string, message: string) => {
      this.dispatch(channel, message);
    });
  }

  async publish(triggerName: string, payload: unknown): Promise<void> {
    try {
      await this.publisher.publish(
        this.toChannel(triggerName),
        encodePubSubPayload(payload),
      );
    } catch (error: unknown) {
      this.logger?.warn(
        `Redis PubSub publish to "${triggerName}" failed; event dropped: ${toErrorMessage(error)}`,
      );
    }
  }

  async subscribe(
    triggerName: string,
    onMessage: MessageHandler,
  ): Promise<number> {
    const channel = this.toChannel(triggerName);
    this.nextSubscriptionId += 1;
    const subscriptionId = this.nextSubscriptionId;
    const existing = this.channels.get(channel);

    this.subscriptions.set(subscriptionId, { channel, onMessage });

    if (existing !== undefined) {
      existing.add(subscriptionId);

      return subscriptionId;
    }

    this.channels.set(channel, new Set([subscriptionId]));

    try {
      await this.subscriber.subscribe(channel);
    } catch (error: unknown) {
      // Roll back so the next subscriber to this channel retries the SUBSCRIBE.
      this.subscriptions.delete(subscriptionId);
      this.channels.delete(channel);
      throw error;
    }

    return subscriptionId;
  }

  unsubscribe(subscriptionId: number): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription === undefined) {
      return;
    }

    this.subscriptions.delete(subscriptionId);

    const ids = this.channels.get(subscription.channel);
    ids?.delete(subscriptionId);
    if (ids === undefined || ids.size > 0) {
      return;
    }

    this.channels.delete(subscription.channel);
    this.subscriber
      .unsubscribe(subscription.channel)
      .catch((error: unknown) => {
        this.logger?.warn(
          `Redis PubSub unsubscribe from "${subscription.channel}" failed: ${toErrorMessage(error)}`,
        );
      });
  }

  /**
   * @description Releases both connections. Failures are logged, never thrown,
   * so a bad connection cannot stall application shutdown.
   */
  async close(): Promise<void> {
    const results = await Promise.allSettled([
      this.subscriber.quit(),
      this.publisher.quit(),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        this.logger?.warn(
          `Redis PubSub connection failed to close: ${toErrorMessage(result.reason)}`,
        );
      }
    }
  }

  private dispatch(channel: string, message: string): void {
    const ids = this.channels.get(channel);
    if (ids === undefined) {
      return;
    }

    const decoded = this.decode(channel, message);
    if (!decoded.ok) {
      return;
    }

    for (const id of ids) {
      this.subscriptions.get(id)?.onMessage(decoded.payload);
    }
  }

  private decode(channel: string, message: string): DecodeResult {
    try {
      return { ok: true, payload: decodePubSubPayload(message) };
    } catch (error: unknown) {
      this.logger?.error(
        `Redis PubSub dropped an undecodable message on "${channel}": ${toErrorMessage(error)}`,
      );

      return { ok: false };
    }
  }

  private toChannel(triggerName: string): string {
    return `${this.channelPrefix}${triggerName}`;
  }
}
