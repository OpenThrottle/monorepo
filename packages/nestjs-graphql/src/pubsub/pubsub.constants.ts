/**
 * @description Nest DI token for the shared GraphQL-subscriptions PubSub engine.
 * Resolvers inject it with `@Inject(PUB_SUB)` typed as {@link PubSubEngine} so the
 * concrete implementation (in-memory now, Redis-backed later) stays swappable.
 */
import type { PubSubEngine } from 'graphql-subscriptions';

/** Injection token for the process-wide {@link PubSubEngine} instance. */
export const PUB_SUB = Symbol('PUB_SUB');

/** Re-exported for resolver typings: the engine API both backends implement. */
export type { PubSubEngine };
