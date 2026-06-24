import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CURSOR_AGENT_BIN_ENV } from '../argv.js';
import {
  createCursorAgentSession,
  cursorAgentConversationBackend,
} from '../cursor-agent.js';
import { AGENT_IDLE_TIMEOUT_MS_ENV } from '../teardown.js';
import type { ConversationStreamChunk } from '../../types.js';

let dir: string;

/** Write an executable node script and return its path. */
function writeFakeBin(name: string, body: string): string {
  const path = join(dir, name);
  writeFileSync(path, `#!/usr/bin/env node\n${body}\n`, 'utf8');
  chmodSync(path, 0o755);
  return path;
}

// A successful streamed turn: init → two text deltas → final echo → result.
const successBin = (): string =>
  writeFakeBin(
    'cursor-success.js',
    `const lines = [
      JSON.stringify({ type: 'system', subtype: 'init', session_id: 'sess-1', cwd: '/x', model: 'Auto' }),
      JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'hello' }] }, timestamp_ms: 1 }),
      JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: ' world' }] }, timestamp_ms: 2 }),
      JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'hello world' }] } }),
      JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'hello world', usage: { outputTokens: 5 } }),
    ];
    process.stdout.write(lines.join('\\n') + '\\n');`,
  );

// A startup failure: nothing on stdout, a message on stderr, non-zero exit.
const errorBin = (): string =>
  writeFakeBin(
    'cursor-error.js',
    `process.stderr.write('Workspace Trust Required\\n');
    process.exit(1);`,
  );

// create-chat: prints a bare session id on stdout.
const createChatBin = (): string =>
  writeFakeBin(
    'cursor-create.js',
    `process.stdout.write('new-session-id\\n');`,
  );

// Emits one event, then hangs (no result, no further output) until killed.
const hangBin = (): string =>
  writeFakeBin(
    'cursor-hang.js',
    `process.stdout.write(JSON.stringify({ type: 'system', subtype: 'init', session_id: 'sess-1' }) + '\\n');
    setInterval(() => {}, 1000000);`,
  );

async function collect(
  run: Parameters<typeof cursorAgentConversationBackend.stream>[0],
): Promise<ConversationStreamChunk[]> {
  const chunks: ConversationStreamChunk[] = [];
  for await (const chunk of cursorAgentConversationBackend.stream(run)) {
    chunks.push(chunk);
  }
  return chunks;
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'cursor-adapter-'));
});

afterAll(() => {
  rmSync(dir, { force: true, recursive: true });
  delete process.env[CURSOR_AGENT_BIN_ENV];
});

describe('cursorAgentConversationBackend', () => {
  it('spawns, parses NDJSON, and yields session + text deltas + a terminal chunk', async () => {
    process.env[CURSOR_AGENT_BIN_ENV] = successBin();

    const chunks = await collect({
      cwd: dir,
      messages: [{ content: 'hi', role: 'user' }],
      model: 'auto',
      sessionId: 'sess-1',
    });

    expect(chunks.map((chunk) => chunk.kind)).toEqual([
      'session',
      'text',
      'text',
      'usage',
    ]);
    expect(chunks[0]?.metadata?.sessionId).toBe('sess-1');
    expect(chunks[1]?.delta).toBe('hello');
    expect(chunks[2]?.delta).toBe(' world');
    const terminal = chunks.at(-1);
    expect(terminal).toMatchObject({ done: true, error: null });
  });

  it('synthesizes a terminal error chunk from stderr when the process fails with no result', async () => {
    process.env[CURSOR_AGENT_BIN_ENV] = errorBin();

    const chunks = await collect({
      cwd: dir,
      messages: [{ content: 'hi', role: 'user' }],
      model: 'auto',
      sessionId: 'sess-1',
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ done: true });
    expect(chunks[0]?.error).toContain('Workspace Trust Required');
  });

  it('requires cwd and sessionId', async () => {
    process.env[CURSOR_AGENT_BIN_ENV] = successBin();
    await expect(
      collect({
        messages: [{ content: 'hi', role: 'user' }],
        model: 'm',
        sessionId: 's',
      }),
    ).rejects.toThrow('requires a cwd');
    await expect(
      collect({
        cwd: dir,
        messages: [{ content: 'hi', role: 'user' }],
        model: 'm',
      }),
    ).rejects.toThrow('requires a sessionId');
  });

  it('spawns with a scrubbed env: passes HOME but not arbitrary server secrets', async () => {
    // A bin that reports, via its result text, whether a secret leaked through.
    process.env[CURSOR_AGENT_BIN_ENV] = writeFakeBin(
      'cursor-env.js',
      `const leaked = process.env.FAKE_SERVER_SECRET ? 'LEAKED' : 'clean';
      const home = process.env.HOME ? 'home:y' : 'home:n';
      process.stdout.write(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: leaked + '|' + home }) + '\\n');`,
    );
    process.env.FAKE_SERVER_SECRET = 'super-secret-value';
    try {
      const chunks = await collect({
        cwd: dir,
        messages: [{ content: 'hi', role: 'user' }],
        model: 'auto',
        sessionId: 'sess-1',
      });
      const terminal = chunks.at(-1);
      expect(terminal?.metadata?.result).toBe('clean|home:y');
    } finally {
      delete process.env.FAKE_SERVER_SECRET;
    }
  });

  it('kills a hung process on the idle timeout and yields an idle-timeout error', async () => {
    process.env[CURSOR_AGENT_BIN_ENV] = hangBin();
    process.env[AGENT_IDLE_TIMEOUT_MS_ENV] = '200';
    try {
      const chunks = await collect({
        cwd: dir,
        messages: [{ content: 'hi', role: 'user' }],
        model: 'auto',
        sessionId: 'sess-1',
      });
      const terminal = chunks.at(-1);
      expect(terminal).toMatchObject({ done: true });
      expect(terminal?.error).toContain('idle timeout');
    } finally {
      delete process.env[AGENT_IDLE_TIMEOUT_MS_ENV];
    }
  });

  it('tears down the child and yields a cancelled error when the signal aborts', async () => {
    process.env[CURSOR_AGENT_BIN_ENV] = hangBin();
    const controller = new AbortController();

    const chunks: ConversationStreamChunk[] = [];
    for await (const chunk of cursorAgentConversationBackend.stream({
      cwd: dir,
      messages: [{ content: 'hi', role: 'user' }],
      model: 'auto',
      sessionId: 'sess-1',
      signal: controller.signal,
    })) {
      chunks.push(chunk);
      controller.abort();
    }

    const terminal = chunks.at(-1);
    expect(terminal).toMatchObject({ done: true });
    expect(terminal?.error).toContain('cancelled');
  });
});

describe('createCursorAgentSession', () => {
  it('returns the trimmed session id printed by create-chat', async () => {
    process.env[CURSOR_AGENT_BIN_ENV] = createChatBin();
    await expect(createCursorAgentSession({ cwd: dir })).resolves.toBe(
      'new-session-id',
    );
  });

  it('throws when create-chat exits non-zero', async () => {
    process.env[CURSOR_AGENT_BIN_ENV] = errorBin();
    await expect(createCursorAgentSession({ cwd: dir })).rejects.toThrow(
      'create-chat failed',
    );
  });
});
