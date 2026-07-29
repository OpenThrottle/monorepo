import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GROK_BIN_ENV } from '../argv.ts';
import { grokConversationBackend } from '../grok.ts';
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

// A successful streamed turn: thought → text deltas → terminal `end` (session + usage).
const successBin = (): string =>
  writeFakeBin(
    'grok-success.js',
    `const lines = [
      JSON.stringify({ type: 'thought', data: 'thinking' }),
      JSON.stringify({ type: 'text', data: 'po' }),
      JSON.stringify({ type: 'text', data: 'ng' }),
      JSON.stringify({ type: 'end', sessionId: 'ses_1', stopReason: 'EndTurn', usage: { total_tokens: 5 }, num_turns: 1 }),
    ];
    process.stdout.write(lines.join('\\n') + '\\n');`,
  );

// A startup failure: nothing on stdout, a message on stderr, non-zero exit.
const errorBin = (): string =>
  writeFakeBin(
    'grok-error.js',
    `process.stderr.write('grok: not logged in\\n');
    process.exit(1);`,
  );

// Emits one event, then hangs (no further output) until killed.
const hangBin = (): string =>
  writeFakeBin(
    'grok-hang.js',
    `process.stdout.write(JSON.stringify({ type: 'thought', data: 'x' }) + '\\n');
    setInterval(() => {}, 1000000);`,
  );

async function collect(
  run: Parameters<typeof grokConversationBackend.stream>[0],
): Promise<ConversationStreamChunk[]> {
  const chunks: ConversationStreamChunk[] = [];
  for await (const chunk of grokConversationBackend.stream(run)) {
    chunks.push(chunk);
  }
  return chunks;
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'grok-adapter-'));
});

afterAll(() => {
  rmSync(dir, { force: true, recursive: true });
  delete process.env[GROK_BIN_ENV];
});

describe('grokConversationBackend', () => {
  it('spawns, streams thinking + text, surfaces the minted session, ends on `end`', async () => {
    process.env[GROK_BIN_ENV] = successBin();

    const chunks = await collect({
      cwd: dir,
      messages: [{ content: 'hi', role: 'user' }],
      model: 'grok-4.5-build',
    });

    expect(chunks.map((chunk) => chunk.kind)).toEqual([
      'thinking',
      'text',
      'text',
      'session',
      'usage',
    ]);
    expect(chunks.find((c) => c.kind === 'session')?.metadata?.sessionId).toBe(
      'ses_1',
    );
    // Text deltas concatenate to the full assistant message.
    expect(
      chunks
        .filter((c) => c.kind === 'text')
        .map((c) => c.delta)
        .join(''),
    ).toBe('pong');
    const terminal = chunks.at(-1);
    expect(terminal).toMatchObject({ done: true, error: null, kind: 'usage' });
  });

  it('synthesizes a terminal error chunk from stderr when the process fails', async () => {
    process.env[GROK_BIN_ENV] = errorBin();

    const chunks = await collect({
      cwd: dir,
      messages: [{ content: 'hi', role: 'user' }],
      model: 'm',
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ done: true });
    expect(chunks[0]?.error).toContain('not logged in');
  });

  it('requires cwd but not sessionId (grok mints the session)', async () => {
    process.env[GROK_BIN_ENV] = successBin();
    await expect(
      collect({ messages: [{ content: 'hi', role: 'user' }], model: 'm' }),
    ).rejects.toThrow('requires a cwd');
  });

  it('spawns with a scrubbed env: passes HOME but not arbitrary server secrets', async () => {
    process.env[GROK_BIN_ENV] = writeFakeBin(
      'grok-env.js',
      `const leaked = process.env.FAKE_SERVER_SECRET ? 'LEAKED' : 'clean';
      const home = process.env.HOME ? 'home:y' : 'home:n';
      process.stdout.write(JSON.stringify({ type: 'text', data: leaked + '|' + home }) + '\\n');
      process.stdout.write(JSON.stringify({ type: 'end', sessionId: 's', usage: {} }) + '\\n');`,
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
    process.env[GROK_BIN_ENV] = hangBin();
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
    process.env[GROK_BIN_ENV] = hangBin();
    const controller = new AbortController();

    const chunks: ConversationStreamChunk[] = [];
    for await (const chunk of grokConversationBackend.stream({
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
