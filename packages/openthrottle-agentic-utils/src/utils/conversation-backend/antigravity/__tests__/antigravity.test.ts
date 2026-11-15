import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { AGENT_IDLE_TIMEOUT_MS_ENV } from '../../cursor-agent/teardown.ts';
import type {
  ConversationBackendRun,
  ConversationStreamChunk,
} from '../../types.ts';
import { antigravityConversationBackend } from '../antigravity.ts';
import { ANTIGRAVITY_BIN_ENV } from '../argv.ts';

let dir: string;

/** Write an executable node script and return its path. */
function writeFakeBin(name: string, body: string): string {
  const path = join(dir, name);
  writeFileSync(path, `#!/usr/bin/env node\n${body}\n`, 'utf8');
  chmodSync(path, 0o755);
  return path;
}

/**
 * agy 1.5.9 as it behaved in conversation 54a41391: `init`, then silence while its plugin MCP
 * servers connect, and — once SIGTERMed — the `result` it really writes on the way out.
 */
const silentUntilTerminatedBin = (): string => {
  return writeFakeBin(
    'agy-silent.js',
    `const emit = (event) => process.stdout.write(JSON.stringify(event) + '\\n');
    emit({ event: 'init', conversation_id: 'conv-1', init: { cwd: '/x' } });
    process.on('SIGTERM', () => {
      emit({ event: 'result', result: { conversation_id: 'conv-1', status: 'ERROR', response: '', error: 'interrupted', finished_reason: 'interrupted', num_turns: 0, usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 } } });
      process.exit(1);
    });
    setInterval(() => {}, 1000);`,
  );
};

/** A turn agy itself fails: its own error is the terminal error. */
const failingBin = (): string => {
  return writeFakeBin(
    'agy-failing.js',
    `process.stdout.write(JSON.stringify({ event: 'result', result: { status: 'ERROR', response: '', error: 'quota exhausted' } }) + '\\n');`,
  );
};

const run = (): ConversationBackendRun => {
  return {
    cwd: dir,
    messages: [{ content: 'hi', role: 'user' }],
    model: '',
  };
};

async function collect(
  input: ConversationBackendRun,
): Promise<ConversationStreamChunk[]> {
  const chunks: ConversationStreamChunk[] = [];
  for await (const chunk of antigravityConversationBackend.stream(input)) {
    chunks.push(chunk);
  }
  return chunks;
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'antigravity-adapter-'));
});

afterEach(() => {
  delete process.env[AGENT_IDLE_TIMEOUT_MS_ENV];
});

afterAll(() => {
  rmSync(dir, { force: true, recursive: true });
  delete process.env[ANTIGRAVITY_BIN_ENV];
});

describe('antigravityConversationBackend', () => {
  describe('when the idle timer stops agy', () => {
    it("reports the idle stop, not agy's own 'interrupted' result", async () => {
      process.env[ANTIGRAVITY_BIN_ENV] = silentUntilTerminatedBin();
      process.env[AGENT_IDLE_TIMEOUT_MS_ENV] = '300';

      const chunks = await collect(run());
      const terminals = chunks.filter((chunk) => chunk.done);

      expect(terminals).toHaveLength(1);
      expect(terminals[0]?.error).toMatch(/no output for 0s and was stopped/);
      expect(terminals[0]?.error).toMatch(/MCP servers/);
      expect(terminals[0]?.error).not.toBe('interrupted');
    });
  });

  describe('when agy fails on its own', () => {
    it('keeps the error agy reported', async () => {
      process.env[ANTIGRAVITY_BIN_ENV] = failingBin();

      const chunks = await collect(run());

      expect(chunks.at(-1)).toMatchObject({
        done: true,
        error: 'quota exhausted',
      });
    });
  });
});
