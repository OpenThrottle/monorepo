import { userInfo } from 'node:os';

import { describe, expect, it } from 'vitest';

import type { AcpFrame } from '../../types/transcript.ts';
import {
  createAcpNormalizer,
  redactHostUser,
  redactMcpServers,
  stripMeta,
} from '../acp-normalize.ts';
import { createSanitizer, placeholderUuid, REDACTED } from '../sanitizer.ts';

const UUID = '3f2b8c1e-9d4a-4e6b-8a7c-1d2e3f4a5b6c';

const newNormalizer = (redactKeys: readonly string[] = []) => {
  const sanitizer = createSanitizer({
    paths: [{ path: '/work/cwd', token: '<CWD>' }],
    redactKeys,
  });
  return createAcpNormalizer({ sanitizer });
};

const client = (message: Record<string, unknown>): AcpFrame => {
  return { from: 'client', message };
};

const agent = (message: Record<string, unknown>): AcpFrame => {
  return { from: 'agent', message };
};

describe('stripMeta', () => {
  it('drops _meta at every depth, through arrays too', () => {
    const result = stripMeta({
      _meta: { a: 1 },
      list: [{ _meta: 1, keep: true }],
      nested: { _meta: {}, value: 2 },
    });

    expect(result).toEqual({ list: [{ keep: true }], nested: { value: 2 } });
  });

  it('leaves scalars alone', () => {
    expect(stripMeta('text')).toBe('text');
  });
});

describe('redactMcpServers', () => {
  describe('when env is a list of name/value pairs', () => {
    it('keeps names and server names, redacts values', () => {
      const result = redactMcpServers({
        cwd: '/work/cwd',
        mcpServers: [
          {
            args: ['--x'],
            command: '/usr/bin/node',
            env: [{ name: 'TOKEN', value: 'secret' }],
            name: 'openthrottle',
          },
        ],
      });

      expect(result).toEqual({
        cwd: '/work/cwd',
        mcpServers: [
          {
            args: ['--x'],
            command: '/usr/bin/node',
            env: [{ name: 'TOKEN', value: REDACTED }],
            name: 'openthrottle',
          },
        ],
      });
    });
  });

  describe('when env is a map', () => {
    it('keeps the keys, redacts the values', () => {
      const result = redactMcpServers({
        mcpServers: [{ env: { TOKEN: 'secret' }, name: 'a' }],
      });

      expect(result).toEqual({
        mcpServers: [{ env: { TOKEN: REDACTED }, name: 'a' }],
      });
    });
  });

  describe('when there are no mcpServers', () => {
    it('returns the params unchanged', () => {
      expect(redactMcpServers({ cwd: 'x' })).toEqual({ cwd: 'x' });
    });
  });
});

describe('createAcpNormalizer host commands', () => {
  it('empties the available command list, keeping the frame', () => {
    const result = newNormalizer().normalizeFrame(
      agent({
        method: 'session/update',
        params: {
          sessionId: 's',
          update: {
            availableCommands: [{ description: 'private', name: 'my-skill' }],
            sessionUpdate: 'available_commands_update',
          },
        },
      }),
    );

    expect(result.message.params).toEqual({
      sessionId: 's',
      update: {
        availableCommands: [],
        sessionUpdate: 'available_commands_update',
      },
    });
  });
});

describe('createAcpNormalizer', () => {
  describe('ids', () => {
    it('renumbers each direction from 0 in first-appearance order', () => {
      const normalizer = newNormalizer();
      const frames = [
        client({ id: 41, method: 'initialize' }),
        agent({ id: 41, result: {} }),
        client({ id: 'abc', method: 'session/new' }),
        agent({ id: 7, method: 'session/request_permission' }),
        client({ id: 7, result: {} }),
        agent({ id: 'abc', result: {} }),
        agent({ id: 8, method: 'fs/read_text_file' }),
      ];

      const ids = frames.map((frame) => {
        return normalizer.normalizeFrame(frame).message.id;
      });

      // client requests: 41→0, 'abc'→1; agent requests: 7→0, 8→1.
      expect(ids).toEqual([0, 0, 1, 0, 0, 1, 1]);
    });

    it('leaves notifications without an id and null ids alone', () => {
      const normalizer = newNormalizer();

      const notification = normalizer.normalizeFrame(
        agent({ method: 'session/update', params: {} }),
      );
      const failure = normalizer.normalizeFrame(
        agent({ error: { code: -32700 }, id: null }),
      );

      expect('id' in notification.message).toBe(false);
      expect(failure.message.id).toBeNull();
    });

    it('numbers a response to an unseen request as the next of its side', () => {
      const normalizer = newNormalizer();

      const stray = normalizer.normalizeFrame(agent({ id: 99, result: {} }));

      expect(stray.message.id).toBe(0);
    });
  });

  describe('sanitizing', () => {
    it('maps UUIDs in order of appearance and tokenizes paths', () => {
      const normalizer = newNormalizer();

      const first = normalizer.normalizeFrame(
        client({
          id: 1,
          method: 'session/new',
          params: { cwd: '/work/cwd/sub' },
        }),
      );
      const second = normalizer.normalizeFrame(
        agent({ id: 1, result: { sessionId: UUID } }),
      );
      const third = normalizer.normalizeFrame(
        client({
          id: 2,
          method: 'session/prompt',
          params: { sessionId: UUID },
        }),
      );

      expect(first.message.params).toEqual({ cwd: '<CWD>/sub' });
      expect(second.message.result).toEqual({ sessionId: placeholderUuid(1) });
      expect(third.message.params).toEqual({ sessionId: placeholderUuid(1) });
    });

    it('applies the backend redact keys', () => {
      const normalizer = newNormalizer(['apiKey']);

      const result = normalizer.normalizeFrame(
        agent({ id: 1, result: { apiKey: 'sk', ok: true } }),
      );

      expect(result.message.result).toEqual({ apiKey: REDACTED, ok: true });
    });
  });

  describe('session/new', () => {
    it('drops _meta and redacts mcp server env values', () => {
      const normalizer = newNormalizer();

      const result = normalizer.normalizeFrame(
        client({
          _meta: { x: 1 },
          id: 1,
          method: 'session/new',
          params: {
            _meta: {},
            cwd: '/work/cwd',
            mcpServers: [
              {
                command: '/work/cwd/bin/mcp',
                env: [{ name: 'KEY', value: 'v' }],
                name: 'ot',
              },
            ],
          },
        }),
      );

      expect(result.message).toEqual({
        id: 0,
        method: 'session/new',
        params: {
          cwd: '<CWD>',
          mcpServers: [
            {
              command: '<CWD>/bin/mcp',
              env: [{ name: 'KEY', value: REDACTED }],
              name: 'ot',
            },
          ],
        },
      });
    });
  });

  describe('session/prompt', () => {
    it('does not touch mcpServers-shaped data outside session open methods', () => {
      const normalizer = newNormalizer();

      const result = normalizer.normalizeFrame(
        client({
          id: 1,
          method: 'session/prompt',
          params: { mcpServers: [{ env: [{ name: 'A', value: 'b' }] }] },
        }),
      );

      expect(result.message.params).toEqual({
        mcpServers: [{ env: [{ name: 'A', value: 'b' }] }],
      });
    });
  });
});

describe('redactHostUser', () => {
  it('replaces the user name as a whole word, everywhere', () => {
    expect(redactHostUser('drwx 3 alice staff 96 alice-docs', 'alice')).toBe(
      'drwx 3 <USER> staff 96 <USER>-docs',
    );
    expect(redactHostUser('malice', 'alice')).toBe('malice');
  });

  it('leaves text alone for a very short name', () => {
    expect(redactHostUser('a bc', 'bc')).toBe('a bc');
  });

  it('is applied to every string of a normalized frame', () => {
    const { username } = userInfo();
    const result = newNormalizer().normalizeFrame(
      agent({ id: 1, result: { stdout: `owner ${username} staff` } }),
    );

    expect(result.message.result).toEqual({
      stdout:
        username.length < 3 ? `owner ${username} staff` : 'owner <USER> staff',
    });
  });
});
