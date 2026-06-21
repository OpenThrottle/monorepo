import { PubSub } from 'graphql-subscriptions';
import { describe, expect, it } from 'vitest';
import { createPubSub } from './pubsub.module';

describe('createPubSub', () => {
  it('builds a PubSubEngine (in-memory PubSub) instance', () => {
    expect(createPubSub()).toBeInstanceOf(PubSub);
  });

  it('returns an engine exposing the publish/asyncIterator contract', () => {
    const engine = createPubSub();

    expect(engine.publish).toBeInstanceOf(Function);
    expect(engine.asyncIterator).toBeInstanceOf(Function);
  });

  it('builds a fresh instance per call (factory is not a singleton itself)', () => {
    expect(createPubSub()).not.toBe(createPubSub());
  });
});
