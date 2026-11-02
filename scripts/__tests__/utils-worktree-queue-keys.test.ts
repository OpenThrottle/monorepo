import type { Server, Socket } from 'node:net';
import { createServer } from 'node:net';

import { afterEach, describe, expect, it } from 'vitest';

import {
  deleteKeysMatching,
  encodeRespCommand,
  parseRespReply,
  redisConnectionFromEnv,
  scanKeysMatching,
} from '../utils/worktree-queue-keys.ts';

/** Splits the RESP command arrays a client writes into argv lists (bulk strings only). */
const parseCommands = (raw: string): string[][] => {
  const commands: string[][] = [];
  const lines = raw.split('\r\n');
  for (let index = 0; index < lines.length; index += 1) {
    const header = lines[index] ?? '';
    if (!header.startsWith('*')) continue;
    const args: string[] = [];
    for (let arg = 0; arg < Number(header.slice(1)); arg += 1) {
      args.push(lines[index + 2 + arg * 2] ?? '');
    }
    commands.push(args);
    index += Number(header.slice(1)) * 2;
  }
  return commands;
};

const bulk = (value: string): string => `$${value.length}\r\n${value}\r\n`;

/**
 * A fake Redis: SCAN pages two matching keys at a time over a snapshot taken at cursor 0 (the
 * cursor is the offset into it, 0 = done), UNLINK removes from `store`.
 */
const startFakeRedis = async (
  store: Set<string>,
  commandLog: string[][],
): Promise<Server> => {
  const server = createServer((socket: Socket) => {
    let snapshot: string[] = [];
    socket.on('data', (chunk) => {
      for (const command of parseCommands(chunk.toString('utf8'))) {
        commandLog.push(command);
        const [name, ...rest] = command;
        if (name === 'SCAN') {
          const offset = Number(rest[0]);
          if (offset === 0) {
            const prefix = (rest[2] ?? '').slice(0, -1);
            snapshot = [...store].filter((key) => key.startsWith(prefix));
          }
          const page = snapshot.slice(offset, offset + 2);
          const next = offset + 2 >= snapshot.length ? 0 : offset + 2;
          socket.write(
            `*2\r\n${bulk(String(next))}*${page.length}\r\n${page.map(bulk).join('')}`,
          );
        } else if (name === 'UNLINK') {
          let removed = 0;
          for (const key of rest) removed += store.delete(key) ? 1 : 0;
          socket.write(`:${removed}\r\n`);
        } else {
          socket.write('+OK\r\n');
        }
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server;
};

const portOf = (server: Server): number => {
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('fake redis is not listening on a TCP port');
  }
  return address.port;
};

describe('parseRespReply', () => {
  it('parses simple, integer, bulk, nil and nested array replies', () => {
    expect(parseRespReply(Buffer.from('+OK\r\n'), 0)?.value).toBe('OK');
    expect(parseRespReply(Buffer.from(':42\r\n'), 0)?.value).toBe(42);
    expect(parseRespReply(Buffer.from('$-1\r\n'), 0)?.value).toBeNull();
    expect(
      parseRespReply(Buffer.from('*2\r\n$1\r\n0\r\n*1\r\n$3\r\nabc\r\n'), 0)
        ?.value,
    ).toEqual(['0', ['abc']]);
  });

  it('reports an incomplete reply as undefined and throws on an error reply', () => {
    expect(parseRespReply(Buffer.from('$5\r\nab'), 0)).toBeUndefined();
    expect(parseRespReply(Buffer.from('*2\r\n$1\r\n0\r\n'), 0)).toBeUndefined();
    expect(() => parseRespReply(Buffer.from('-ERR nope\r\n'), 0)).toThrow(
      'ERR nope',
    );
  });
});

describe('encodeRespCommand', () => {
  it('encodes an array of bulk strings by byte length', () => {
    expect(encodeRespCommand(['SCAN', '0'])).toBe(
      '*2\r\n$4\r\nSCAN\r\n$1\r\n0\r\n',
    );
  });
});

describe('redisConnectionFromEnv', () => {
  it('defaults to the primary on localhost:6011', () => {
    expect(redisConnectionFromEnv({})).toEqual({
      db: 0,
      host: 'localhost',
      password: undefined,
      port: 6011,
      username: undefined,
    });
  });

  it('reads the REDIS_* variables', () => {
    expect(
      redisConnectionFromEnv({
        REDIS_DB: '2',
        REDIS_HOST: 'redis.local',
        REDIS_PASSWORD: 'secret',
        REDIS_PORT: '6400',
        REDIS_USERNAME: 'ot',
      }),
    ).toEqual({
      db: 2,
      host: 'redis.local',
      password: 'secret',
      port: 6400,
      username: 'ot',
    });
  });
});

describe('deleteKeysMatching', () => {
  let server: Server | undefined;

  afterEach(async () => {
    const closing = server;
    server = undefined;
    if (closing) await new Promise((resolve) => closing.close(resolve));
  });

  it('deletes only the colon-terminated prefix, paging with SCAN, and leaves siblings alone', async () => {
    const store = new Set([
      'bull:wt-loop-plan:a:meta',
      'bull:wt-loop-plan:a:stalled-check',
      'bull:wt-loop-plan:b:meta',
      'bull:wt-loop-plan-stale-worktree-checkouts:a:meta',
      'bull:wt-other:a:meta',
      'bull:a:meta',
    ]);
    const commandLog: string[][] = [];
    server = await startFakeRedis(store, commandLog);

    const deleted = await deleteKeysMatching({
      connection: {
        ...redisConnectionFromEnv({}),
        host: '127.0.0.1',
        port: portOf(server),
      },
      pattern: 'bull:wt-loop-plan:*',
      timeoutMs: 2000,
    });

    expect(deleted).toBe(3);
    expect([...store].sort()).toEqual([
      'bull:a:meta',
      'bull:wt-loop-plan-stale-worktree-checkouts:a:meta',
      'bull:wt-other:a:meta',
    ]);
    expect(
      commandLog.filter(([name]) => name === 'SCAN').length,
    ).toBeGreaterThan(1);
    expect(commandLog.some(([name]) => name === 'KEYS')).toBe(false);
  });

  it('authenticates and selects the db before scanning when configured', async () => {
    const commandLog: string[][] = [];
    server = await startFakeRedis(new Set(), commandLog);

    await deleteKeysMatching({
      connection: {
        db: 3,
        host: '127.0.0.1',
        password: 'pw',
        port: portOf(server),
        username: undefined,
      },
      pattern: 'bull:wt-x:*',
      timeoutMs: 2000,
    });

    expect(commandLog.slice(0, 2)).toEqual([
      ['AUTH', 'pw'],
      ['SELECT', '3'],
    ]);
  });

  it('rejects quickly when nothing is listening, so the caller can fail open', async () => {
    const probe = await startFakeRedis(new Set(), []);
    const port = portOf(probe);
    await new Promise((resolve) => probe.close(resolve));

    await expect(
      deleteKeysMatching({
        connection: { ...redisConnectionFromEnv({}), host: '127.0.0.1', port },
        pattern: 'bull:wt-x:*',
        timeoutMs: 2000,
      }),
    ).rejects.toThrow();
  });

  it('rejects instead of hanging when Redis accepts but never answers', async () => {
    // Accepts and reads, never replies; resume() lets it see the client hang up and close.
    server = createServer((socket) => {
      socket.resume();
    });
    await new Promise<void>((resolve) =>
      server?.listen(0, '127.0.0.1', resolve),
    );

    await expect(
      deleteKeysMatching({
        connection: {
          ...redisConnectionFromEnv({}),
          host: '127.0.0.1',
          port: portOf(server),
        },
        pattern: 'bull:wt-x:*',
        timeoutMs: 150,
      }),
    ).rejects.toThrow(/did not answer|closed/);
  });
});

describe('scanKeysMatching', () => {
  let server: Server | undefined;

  afterEach(async () => {
    const closing = server;
    server = undefined;
    if (closing) await new Promise((resolve) => closing.close(resolve));
  });

  it('pages through every matching key with SCAN and deletes nothing', async () => {
    const store = new Set([
      'bull:wt-a:Plans:meta',
      'bull:wt-a:Plans:stalled-check',
      'bull:wt-b:Plans:meta',
      'bull:wt-c:Daily Stats:meta',
      'bull:Plans:meta',
    ]);
    const commandLog: string[][] = [];
    server = await startFakeRedis(store, commandLog);

    const keys = await scanKeysMatching({
      connection: {
        ...redisConnectionFromEnv({}),
        host: '127.0.0.1',
        port: portOf(server),
      },
      pattern: 'bull:wt-*',
      timeoutMs: 2000,
    });

    expect(keys.sort()).toEqual([
      'bull:wt-a:Plans:meta',
      'bull:wt-a:Plans:stalled-check',
      'bull:wt-b:Plans:meta',
      'bull:wt-c:Daily Stats:meta',
    ]);
    expect(store.size).toBe(5);
    expect(
      commandLog.filter(([name]) => name === 'SCAN').length,
    ).toBeGreaterThan(1);
    expect(
      commandLog.some(([name]) => name === 'KEYS' || name === 'UNLINK'),
    ).toBe(false);
  });
});
