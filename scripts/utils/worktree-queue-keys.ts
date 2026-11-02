/**
 * @description Clears a shared worktree's BullMQ keys from the primary's Redis on teardown.
 *
 * A `shared` worktree runs its queues in the primary's Redis under its own key prefix
 * (`bull:wt-<slug>`, see `resolveQueuePrefix()` in `@openthrottle/nestjs-bullmq`), so removing the
 * worktree leaves `bull:wt-<slug>:<Queue>:meta` / `:stalled-check` behind, accumulating one set per
 * worktree name. This deletes exactly that prefix and nothing else.
 *
 * Dependency-free (node builtins only): teardown runs under bare Node against a worktree whose
 * `node_modules` may be pruned, so there is no ioredis here — a Redis command is a handful of RESP2
 * bytes over `node:net`. Callers treat every failure as non-fatal (Redis down must not block removal).
 */
import { connect } from 'node:net';

/** Every worktree queue prefix starts with this; the primary's `bull` never does. */
const WORKTREE_QUEUE_PREFIX_ROOT = 'bull:wt-';

/** Characters that would turn a prefix into a wider SCAN glob. */
const GLOB_CHARACTERS = /[*?[\]\\]/;

const DEFAULT_REDIS_HOST = 'localhost';
const DEFAULT_REDIS_PORT = 6011;
const SCAN_BATCH_SIZE = 500;

/**
 * @description Mirrors `resolveQueuePrefix()` in `@openthrottle/nestjs-bullmq`: `OT_QUEUE_PREFIX`
 * wins, else `bull:` + `OT_CONTAINER_PREFIX` minus trailing dashes, else BullMQ's bare `bull`.
 * Duplicated rather than imported because teardown cannot depend on a built package.
 */
export const resolveWorktreeQueuePrefix = (
  env: Readonly<Record<string, string | undefined>>,
): string => {
  const explicit = env.OT_QUEUE_PREFIX?.trim();
  if (explicit) return explicit;

  const containerPrefix = env.OT_CONTAINER_PREFIX?.trim().replace(/-+$/, '');
  if (containerPrefix) return `bull:${containerPrefix}`;

  return 'bull';
};

/**
 * @description The SCAN pattern for one worktree's keys, or null when the prefix is not provably a
 * worktree's. The trailing colon is the safety property: `bull:wt-loop-plan:*` cannot match the
 * sibling worktree `bull:wt-loop-plan-stale:...` the way `bull:wt-loop-plan*` would. Refusing the
 * bare `bull` (or anything outside `bull:wt-`) means a misconfigured env can never wipe the
 * primary's queues, and refusing glob characters stops a prefix from widening its own pattern.
 */
export const worktreeQueueKeyPattern = (prefix: string): string | null => {
  if (!prefix.startsWith(WORKTREE_QUEUE_PREFIX_ROOT)) return null;
  if (prefix.length === WORKTREE_QUEUE_PREFIX_ROOT.length) return null;
  if (GLOB_CHARACTERS.test(prefix)) return null;

  return `${prefix}:*`;
};

export interface RedisConnection {
  readonly db: number;
  readonly host: string;
  readonly password: string | undefined;
  readonly port: number;
  readonly username: string | undefined;
}

const parseNonNegativeInt = (value: string | undefined): number | undefined => {
  const parsed = Number(value);
  return value !== undefined && value.trim() !== '' && Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined; // prettier-ignore
};

/** Connection settings from `REDIS_*` env, defaulting to the primary's `localhost:6011`. */
export const redisConnectionFromEnv = (
  env: Readonly<Record<string, string | undefined>>,
): RedisConnection => ({
  db: parseNonNegativeInt(env.REDIS_DB) ?? 0,
  host: env.REDIS_HOST?.trim() || DEFAULT_REDIS_HOST,
  password: env.REDIS_PASSWORD || undefined,
  port: parseNonNegativeInt(env.REDIS_PORT) ?? DEFAULT_REDIS_PORT,
  username: env.REDIS_USERNAME || undefined,
});

type RespValue = string | number | null | RespValue[];

type ParsedReply = { readonly next: number; readonly value: RespValue };

/**
 * Parses one RESP2 reply starting at `start`. Returns undefined while the reply is still
 * incomplete (a Redis nil is `value: null`) and throws on an error reply.
 */
export const parseRespReply = (
  buffer: Buffer,
  start: number,
): ParsedReply | undefined => {
  const lineEnd = buffer.indexOf('\r\n', start);
  if (lineEnd === -1) return undefined;

  const type = buffer.toString('latin1', start, start + 1);
  const line = buffer.toString('utf8', start + 1, lineEnd);
  const next = lineEnd + 2;

  switch (type) {
    case '+':
      return { next, value: line };
    case '-':
      throw new Error(line);
    case ':':
      return { next, value: Number(line) };
    case '$': {
      const length = Number(line);
      if (length < 0) return { next, value: null };
      if (buffer.length < next + length + 2) return undefined;
      return {
        next: next + length + 2,
        value: buffer.toString('utf8', next, next + length),
      };
    }
    case '*': {
      const count = Number(line);
      if (count < 0) return { next, value: null };
      const items: RespValue[] = [];
      let cursor = next;
      for (let index = 0; index < count; index += 1) {
        const item = parseRespReply(buffer, cursor);
        if (item === undefined) return undefined;
        items.push(item.value);
        cursor = item.next;
      }
      return { next: cursor, value: items };
    }
    default:
      throw new Error(`unexpected Redis reply type "${type}"`);
  }
};

/** Encodes a command as a RESP2 array of bulk strings. */
export const encodeRespCommand = (args: readonly string[]): string =>
  `*${args.length}\r\n${args
    .map((arg) => `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`)
    .join('')}`;

type Send = (args: readonly string[]) => Promise<RespValue>;

/**
 * Runs `work` against one short-lived connection. `timeoutMs` bounds the WHOLE exchange (connect
 * included) and there are no retries, so a dead or wedged Redis rejects promptly.
 */
const withRedis = async <T>(
  connection: RedisConnection,
  timeoutMs: number,
  work: (send: Send) => Promise<T>,
): Promise<T> => {
  const socket = connect({ host: connection.host, port: connection.port });
  let buffered = Buffer.alloc(0);
  let waiting: { reject: (error: Error) => void; resolve: (value: RespValue) => void } | undefined; // prettier-ignore
  let failure: Error | undefined;

  const fail = (error: Error): void => {
    failure ??= error;
    const waiter = waiting;
    waiting = undefined;
    waiter?.reject(failure);
  };

  socket.on('error', fail);
  socket.on('close', () => fail(new Error('Redis connection closed')));
  socket.on('data', (chunk) => {
    buffered = Buffer.concat([buffered, chunk]);
    try {
      if (waiting === undefined) return;
      const reply = parseRespReply(buffered, 0);
      if (reply === undefined) return;
      buffered = buffered.subarray(reply.next);
      const waiter = waiting;
      waiting = undefined;
      waiter?.resolve(reply.value);
    } catch (error) {
      fail(error instanceof Error ? error : new Error(String(error)));
    }
  });

  const timer = setTimeout(() => {
    socket.destroy(new Error(`Redis did not answer within ${timeoutMs}ms`));
  }, timeoutMs);

  const send: Send = (args) =>
    new Promise<RespValue>((resolve, reject) => {
      if (failure !== undefined) {
        reject(failure);
        return;
      }
      waiting = { reject, resolve };
      socket.write(encodeRespCommand(args));
    });

  try {
    return await work(send);
  } finally {
    clearTimeout(timer);
    socket.destroy();
  }
};

const isScanReply = (reply: RespValue): reply is [string, string[]] =>
  Array.isArray(reply) &&
  reply.length === 2 &&
  typeof reply[0] === 'string' &&
  Array.isArray(reply[1]) &&
  reply[1].every((key) => typeof key === 'string');

/**
 * Deletes every key matching `pattern` (from `worktreeQueueKeyPattern`) and returns how many went.
 * Cursor-driven SCAN — never KEYS, which would block the primary's Redis — with UNLINK in batches.
 * Each returned key is re-checked against the pattern's literal prefix before it is deleted, so
 * nothing outside it can be removed even if SCAN's glob semantics surprise us.
 */
export const deleteKeysMatching = (params: {
  readonly connection: RedisConnection;
  readonly pattern: string;
  readonly timeoutMs: number;
}): Promise<number> => {
  const { connection, pattern, timeoutMs } = params;
  const literalPrefix = pattern.slice(0, -1);

  return withRedis(connection, timeoutMs, async (send) => {
    if (connection.password !== undefined) {
      await send(connection.username === undefined ? ['AUTH', connection.password] : ['AUTH', connection.username, connection.password]); // prettier-ignore
    }
    if (connection.db !== 0) await send(['SELECT', String(connection.db)]);

    let cursor = '0';
    let deleted = 0;

    /* eslint-disable no-await-in-loop -- each SCAN page needs the previous cursor, and one connection is one command at a time */
    do {
      const reply = await send(['SCAN', cursor, 'MATCH', pattern, 'COUNT', String(SCAN_BATCH_SIZE)]); // prettier-ignore
      if (!isScanReply(reply)) throw new Error('unexpected SCAN reply');

      const [nextCursor, found] = reply;
      cursor = nextCursor;

      const keys = found.filter((key) => key.startsWith(literalPrefix));
      if (keys.length > 0) {
        const removed = await send(['UNLINK', ...keys]);
        deleted += typeof removed === 'number' ? removed : 0;
      }
    } while (cursor !== '0');
    /* eslint-enable no-await-in-loop */

    return deleted;
  });
};
