import type { Queue } from 'bullmq';

/**
 * Raw Redis commands we invoke directly on the BullMQ command connection but
 * which BullMQ's own client interface does not declare.
 *
 * As of BullMQ 5.81 `Queue.client` resolves to the narrowed `IRedisClient`
 * interface, which declares only the Redis commands BullMQ itself uses — so
 * `ping`, `publish`, and `psubscribe` are absent from the type even though the
 * underlying connection (ioredis) implements them. We reach past the queue onto
 * the shared connection for a health-check ping and the plan-cancel pub/sub
 * fast path; this type re-widens the client to exactly those commands.
 *
 * This is the deliberate, single escape hatch for that gap. The long-term fix
 * is to stop borrowing BullMQ's connection and use a dedicated Redis client for
 * control-plane pub/sub and health checks (tracked in OpenThrottle).
 */
interface RawRedisCommands {
  ping(): Promise<string>;
  psubscribe(pattern: string): Promise<number>;
  publish(channel: string, message: string): Promise<number>;
}

/** The BullMQ command connection widened with the raw commands we call on it. */
export type QueueRedisClient = Awaited<Queue['client']> & RawRedisCommands;

/**
 * @description Resolve a BullMQ queue's shared command connection as a
 * {@link QueueRedisClient}, widening BullMQ's narrowed client type to include
 * the raw Redis commands (`ping`/`publish`/`psubscribe`) we invoke on it. See
 * {@link RawRedisCommands} for why this cast is required and sound.
 */
export async function getQueueRedisClient(
  queue: Queue,
): Promise<QueueRedisClient> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- BullMQ narrows Queue.client to IRedisClient (only the commands it uses); the runtime connection is ioredis, which implements the raw commands in RawRedisCommands. Single, documented widening escape hatch (see RawRedisCommands).
  return (await queue.client) as QueueRedisClient;
}

/**
 * @description Duplicate a queue's connection (e.g. to enter Redis subscribe
 * mode without disturbing the shared command connection), keeping the result
 * widened to {@link QueueRedisClient}. BullMQ's `duplicate()` is typed to return
 * the narrowed client, so this re-applies the same widening as
 * {@link getQueueRedisClient}.
 */
export function duplicateQueueRedisClient(
  client: QueueRedisClient,
): QueueRedisClient {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- BullMQ's duplicate() is typed to return the narrowed IRedisClient; re-apply the same widening as getQueueRedisClient (see RawRedisCommands).
  return client.duplicate() as QueueRedisClient;
}
