import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CODEX_BIN_ENV } from '../argv.ts';
import { codexConversationBackend } from '../codex.ts';
import { AGENT_IDLE_TIMEOUT_MS_ENV } from '../../cursor-agent/teardown.ts';
import type { ConversationStreamChunk } from '../../types.ts';

let dir: string;

/** Write an executable node script and return its path. */
function writeFakeBin(name: string, body: string): string {
  const path = join(dir, name);
  writeFileSync(path, `#!/usr/bin/env node\n${body}\n`, 'utf8');
  chmodSync(path, 0o755);
  return path;
}

// A successful streamed turn: thread.started (mints session) → a reasoning item
// → an agent_message item → turn.completed (usage, terminal).
const successBin = (): string =>
  writeFakeBin(
    'codex-success.js',
    `const lines = [
      JSON.stringify({ type: 'thread.started', thread_id: 'th_1' }),
      JSON.stringify({ type: 'turn.started' }),
      JSON.stringify({ type: 'item.completed', item: { id: 'r1', item_type: 'reasoning', text: 'thinking' } }),
      JSON.stringify({ type: 'item.completed', item: { id: 'a1', item_type: 'agent_message', text: 'pong' } }),
      JSON.stringify({ type: 'turn.completed', usage: { input_tokens: 5, output_tokens: 1 } }),
    ];
    process.stdout.write(lines.join('\\n') + '\\n');`,
  );

// A startup failure: nothing on stdout, a message on stderr, non-zero exit.
const errorBin = (): string =>
  writeFakeBin(
    'codex-error.js',
    `process.stderr.write('codex: not logged in\\n');
    process.exit(1);`,
  );

// Emits the session event, then hangs (no further output) until killed.
const hangBin = (): string =>
  writeFakeBin(
    'codex-hang.js',
    `process.stdout.write(JSON.stringify({ type: 'thread.started', thread_id: 'th_1' }) + '\\n');
    setInterval(() => {}, 1000000);`,
  );

async function collect(
  run: Parameters<typeof codexConversationBackend.stream>[0],
): Promise<ConversationStreamChunk[]> {
  const chunks: ConversationStreamChunk[] = [];
  for await (const chunk of codexConversationBackend.stream(run)) {
    chunks.push(chunk);
  }
  return chunks;
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'codex-adapter-'));
});

afterAll(() => {
  rmSync(dir, { force: true, recursive: true });
  delete process.env[CODEX_BIN_ENV];
});

describe('codexConversationBackend', () => {
  it('spawns, surfaces the minted session, streams reasoning + text, ends on turn.completed', async () => {
    process.env[CODEX_BIN_ENV] = successBin();

    const chunks = await collect({
      cwd: dir,
      messages: [{ content: 'hi', role: 'user' }],
      model: 'gpt-5-codex',
    });

    expect(chunks.map((chunk) => chunk.kind)).toEqual([
      'session',
      'thinking',
      'text',
      'usage',
    ]);
    expect(chunks[0]?.metadata?.sessionId).toBe('th_1');
    expect(chunks[2]?.delta).toBe('pong');
    const terminal = chunks.at(-1);
    expect(terminal).toMatchObject({ done: true, error: null, kind: 'usage' });
  });

  it('synthesizes a terminal error chunk from stderr when the process fails', async () => {
    process.env[CODEX_BIN_ENV] = errorBin();

    const chunks = await collect({
      cwd: dir,
      messages: [{ content: 'hi', role: 'user' }],
      model: 'm',
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ done: true });
    expect(chunks[0]?.error).toContain('not logged in');
  });

  it('requires cwd but not sessionId (codex mints the thread)', async () => {
    process.env[CODEX_BIN_ENV] = successBin();
    await expect(
      collect({ messages: [{ content: 'hi', role: 'user' }], model: 'm' }),
    ).rejects.toThrow('requires a cwd');
  });

  it('spawns with a scrubbed env: passes HOME but not arbitrary server secrets', async () => {
    process.env[CODEX_BIN_ENV] = writeFakeBin(
      'codex-env.js',
      `const leaked = process.env.FAKE_SERVER_SECRET ? 'LEAKED' : 'clean';
      const home = process.env.HOME ? 'home:y' : 'home:n';
      process.stdout.write(JSON.stringify({ type: 'item.completed', item: { id: 'a', item_type: 'agent_message', text: leaked + '|' + home } }) + '\\n');
      process.stdout.write(JSON.stringify({ type: 'turn.completed', usage: {} }) + '\\n');`,
    );
    process.env.FAKE_SERVER_SECRET = 'super-secret-value';
    try {
      const chunks = await collect({
        cwd: dir,
        messages: [{ content: 'hi', role: 'user' }],
        model: 'm',
      });
      const textChunk = chunks.find((chunk) => chunk.kind === 'text');
      expect(textChunk?.delta).toBe('clean|home:y');
    } finally {
      delete process.env.FAKE_SERVER_SECRET;
    }
  });

  it('kills a hung process on the idle timeout and yields an idle-timeout error', async () => {
    process.env[CODEX_BIN_ENV] = hangBin();
    process.env[AGENT_IDLE_TIMEOUT_MS_ENV] = '200';
    try {
      const chunks = await collect({
        cwd: dir,
        messages: [{ content: 'hi', role: 'user' }],
        model: 'm',
      });
      const terminal = chunks.at(-1);
      expect(terminal).toMatchObject({ done: true });
      expect(terminal?.error).toContain('idle timeout');
    } finally {
      delete process.env[AGENT_IDLE_TIMEOUT_MS_ENV];
    }
  });

  it('tears down the child and yields a cancelled error when the signal aborts', async () => {
    process.env[CODEX_BIN_ENV] = hangBin();
    const controller = new AbortController();

    const chunks: ConversationStreamChunk[] = [];
    for await (const chunk of codexConversationBackend.stream({
      cwd: dir,
      messages: [{ content: 'hi', role: 'user' }],
      model: 'm',
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
