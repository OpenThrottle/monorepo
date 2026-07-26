import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { OPENCODE_BIN_ENV } from '../argv.ts';
import { opencodeConversationBackend } from '../opencode.ts';
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

// A successful streamed turn: step_start (mints session) → two text snapshots
// sharing a part id (suffix-dedup) → step_finish → clean exit (no result event).
const successBin = (): string =>
  writeFakeBin(
    'opencode-success.js',
    `const lines = [
      JSON.stringify({ type: 'step_start', sessionID: 'ses_1', part: { id: 'prt_s', type: 'step-start', sessionID: 'ses_1' } }),
      JSON.stringify({ type: 'text', sessionID: 'ses_1', part: { id: 'prt_1', type: 'text', text: 'hello' } }),
      JSON.stringify({ type: 'text', sessionID: 'ses_1', part: { id: 'prt_1', type: 'text', text: 'hello world' } }),
      JSON.stringify({ type: 'step_finish', sessionID: 'ses_1', part: { type: 'step-finish', tokens: { total: 7 }, cost: 0 } }),
    ];
    process.stdout.write(lines.join('\\n') + '\\n');`,
  );

// A startup failure: nothing on stdout, a message on stderr, non-zero exit.
const errorBin = (): string =>
  writeFakeBin(
    'opencode-error.js',
    `process.stderr.write('unknown model\\n');
    process.exit(1);`,
  );

// Emits one event, then hangs (no further output) until killed.
const hangBin = (): string =>
  writeFakeBin(
    'opencode-hang.js',
    `process.stdout.write(JSON.stringify({ type: 'step_start', sessionID: 'ses_1', part: { id: 'prt_s', type: 'step-start' } }) + '\\n');
    setInterval(() => {}, 1000000);`,
  );

async function collect(
  run: Parameters<typeof opencodeConversationBackend.stream>[0],
): Promise<ConversationStreamChunk[]> {
  const chunks: ConversationStreamChunk[] = [];
  for await (const chunk of opencodeConversationBackend.stream(run)) {
    chunks.push(chunk);
  }
  return chunks;
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'opencode-adapter-'));
});

afterAll(() => {
  rmSync(dir, { force: true, recursive: true });
  delete process.env[OPENCODE_BIN_ENV];
});

describe('opencodeConversationBackend', () => {
  it('spawns, dedupes snapshot text by part id, and ends with a clean terminal on process exit', async () => {
    process.env[OPENCODE_BIN_ENV] = successBin();

    const chunks = await collect({
      cwd: dir,
      messages: [{ content: 'hi', role: 'user' }],
      model: 'opencode/nemotron-3-ultra-free',
    });

    expect(chunks.map((chunk) => chunk.kind)).toEqual([
      'session',
      'text',
      'text',
      'usage',
      'text',
    ]);
    expect(chunks[0]?.metadata?.sessionId).toBe('ses_1');
    expect(chunks[1]?.delta).toBe('hello');
    expect(chunks[2]?.delta).toBe(' world');
    const terminal = chunks.at(-1);
    expect(terminal).toMatchObject({ done: true, error: null });
  });

  it('synthesizes a terminal error chunk from stderr when the process fails', async () => {
    process.env[OPENCODE_BIN_ENV] = errorBin();

    const chunks = await collect({
      cwd: dir,
      messages: [{ content: 'hi', role: 'user' }],
      model: 'bad/model',
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ done: true });
    expect(chunks[0]?.error).toContain('unknown model');
  });

  it('requires cwd but not sessionId (opencode mints the session)', async () => {
    process.env[OPENCODE_BIN_ENV] = successBin();
    await expect(
      collect({ messages: [{ content: 'hi', role: 'user' }], model: 'm' }),
    ).rejects.toThrow('requires a cwd');
  });

  it('spawns with a scrubbed env: passes HOME but not arbitrary server secrets', async () => {
    process.env[OPENCODE_BIN_ENV] = writeFakeBin(
      'opencode-env.js',
      `const leaked = process.env.FAKE_SERVER_SECRET ? 'LEAKED' : 'clean';
      const home = process.env.HOME ? 'home:y' : 'home:n';
      process.stdout.write(JSON.stringify({ type: 'text', sessionID: 'ses_1', part: { id: 'p', type: 'text', text: leaked + '|' + home } }) + '\\n');`,
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
    process.env[OPENCODE_BIN_ENV] = hangBin();
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
    process.env[OPENCODE_BIN_ENV] = hangBin();
    const controller = new AbortController();

    const chunks: ConversationStreamChunk[] = [];
    for await (const chunk of opencodeConversationBackend.stream({
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
