import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CURSOR_AGENT_BIN_ENV } from '../argv.ts';
import {
  createCursorAgentSession,
  cursorAgentConversationBackend,
} from '../cursor-agent.ts';
import {
  AGENT_IDLE_TIMEOUT_MS_ENV,
  AGENT_SESSION_TIMEOUT_MS_ENV,
} from '../teardown.ts';
import type { ConversationStreamChunk } from '../../types.ts';

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

  it('passes through the env cursor provably reads, forces NO_COLOR, and still blocks server secrets', async () => {
    // Reports the child's own view of its environment as the result text, so
    // the assertions below are about the REAL spawned env, not a mock.
    process.env[CURSOR_AGENT_BIN_ENV] = writeFakeBin(
      'cursor-env-allowlist.js',
      `const keys = ['AGENT_CLI_CREDENTIAL_STORE','CURSOR_AUTH_TOKEN','CURSOR_DATA_DIR','FAKE_SERVER_SECRET','HTTPS_PROXY','NO_COLOR','NO_PROXY','SHELL','XDG_CACHE_HOME','XDG_CONFIG_HOME'];
      const seen = {};
      for (const key of keys) { seen[key] = process.env[key] ?? null; }
      process.stdout.write(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: JSON.stringify(seen) }) + '\\n');`,
    );

    const hostEnv: Readonly<Record<string, string>> = {
      AGENT_CLI_CREDENTIAL_STORE: 'file',
      CURSOR_AUTH_TOKEN: 'auth-token',
      CURSOR_DATA_DIR: '/custom/cursor',
      FAKE_SERVER_SECRET: 'super-secret-value',
      HTTPS_PROXY: 'http://proxy.internal:3128',
      NO_COLOR: 'not-this-value',
      NO_PROXY: 'localhost',
      SHELL: '/bin/zsh',
      XDG_CACHE_HOME: '/custom/cache',
      XDG_CONFIG_HOME: '/custom/config',
    };
    Object.assign(process.env, hostEnv);

    try {
      const chunks = await collect({
        cwd: dir,
        messages: [{ content: 'hi', role: 'user' }],
        model: 'auto',
        sessionId: 'sess-1',
      });

      const raw = chunks.at(-1)?.metadata?.result;
      const seen: Record<string, string | null> = JSON.parse(String(raw));

      // Everything cursor provably reads reaches the child.
      expect(seen.AGENT_CLI_CREDENTIAL_STORE).toBe('file');
      expect(seen.CURSOR_AUTH_TOKEN).toBe('auth-token');
      expect(seen.HTTPS_PROXY).toBe('http://proxy.internal:3128');
      expect(seen.NO_PROXY).toBe('localhost');
      expect(seen.SHELL).toBe('/bin/zsh');
      expect(seen.XDG_CACHE_HOME).toBe('/custom/cache');
      expect(seen.XDG_CONFIG_HOME).toBe('/custom/config');

      // CURSOR_* passes through by prefix, so a knob added in a future cursor
      // release does not need an allowlist edit.
      expect(seen.CURSOR_DATA_DIR).toBe('/custom/cursor');

      // Forced, and the host cannot override it.
      expect(seen.NO_COLOR).toBe('1');

      // The posture that must never regress.
      expect(seen.FAKE_SERVER_SECRET).toBeNull();
    } finally {
      for (const key of Object.keys(hostEnv)) {
        delete process.env[key];
      }
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

  it('throws when create-chat exits non-zero, attaching the full evidence', async () => {
    const bin = errorBin();
    process.env[CURSOR_AGENT_BIN_ENV] = bin;

    const error = await createCursorAgentSession({ cwd: dir }).catch(
      (thrown: unknown) => thrown,
    );

    expect(error).toBeInstanceOf(Error);
    const message = error instanceof Error ? error.message : '';
    expect(message).toContain('create-chat failed (exit 1)');
    // The evidence a mint failure is undiagnosable without.
    expect(message).toContain(`bin=${bin}`);
    expect(message).toContain(`cwd=${dir}`);
    expect(message).toMatch(/elapsedMs=\d+/);
    expect(message).toContain('Workspace Trust Required');
    expect(message).toContain('stdout=<empty>');
  });

  it('throws with the captured stdout when create-chat prints no id', async () => {
    // A banner on stdout and nothing that could be an id: the old message said
    // only "returned no session id" and dropped every byte of evidence.
    process.env[CURSOR_AGENT_BIN_ENV] = writeFakeBin(
      'cursor-create-banner.js',
      `process.stdout.write('   \\n');
      process.stderr.write('update available\\n');`,
    );

    const error = await createCursorAgentSession({ cwd: dir }).catch(
      (thrown: unknown) => thrown,
    );

    const message = error instanceof Error ? error.message : '';
    expect(message).toContain('returned no recognizable session id');
    expect(message).toContain('update available');
  });

  it('rejects a banner-only stdout instead of resuming on it', async () => {
    // `--resume` accepts any string, so trusting this would silently start a
    // fresh, disconnected chat rather than failing.
    process.env[CURSOR_AGENT_BIN_ENV] = writeFakeBin(
      'cursor-create-noise.js',
      `process.stdout.write('Update available!  1.2.3\\n');`,
    );

    const error = await createCursorAgentSession({ cwd: dir }).catch(
      (thrown: unknown) => thrown,
    );

    const message = error instanceof Error ? error.message : '';
    expect(message).toContain('returned no recognizable session id');
    expect(message).toContain('Update available!');
  });

  it('parses the id out of a banner-prefixed stdout', async () => {
    process.env[CURSOR_AGENT_BIN_ENV] = writeFakeBin(
      'cursor-create-banner-id.js',
      `process.stdout.write('Update available!  1.2.3\\n');
      process.stdout.write('05dbda6a-4b19-4862-b4fc-205c78affb66\\n');`,
    );

    await expect(createCursorAgentSession({ cwd: dir })).resolves.toBe(
      '05dbda6a-4b19-4862-b4fc-205c78affb66',
    );
  });

  it('redacts a token-shaped value the child echoed before failing', async () => {
    process.env[CURSOR_AGENT_BIN_ENV] = writeFakeBin(
      'cursor-create-leak.js',
      `process.stderr.write('auth failed for key_0123456789abcdefghij\\n');
      process.exit(1);`,
    );

    const error = await createCursorAgentSession({ cwd: dir }).catch(
      (thrown: unknown) => thrown,
    );

    const message = error instanceof Error ? error.message : '';
    expect(message).not.toContain('key_0123456789abcdefghij');
    expect(message).toContain('[REDACTED]');
  });

  it('resolves on the printed id without waiting for a process that lingers', async () => {
    // The cold-start failure, reproduced: cursor prints the id promptly but the
    // process does not exit for far longer than the mint budget. Waiting for
    // `close` meant timing out and discarding an id we already had.
    process.env[CURSOR_AGENT_BIN_ENV] = writeFakeBin(
      'cursor-create-lingering.js',
      `console.log('05dbda6a-4b19-4862-b4fc-205c78affb66');
      setInterval(() => {}, 1000000);`,
    );
    process.env[AGENT_SESSION_TIMEOUT_MS_ENV] = '3000';

    try {
      const startedAt = Date.now();
      await expect(createCursorAgentSession({ cwd: dir })).resolves.toBe(
        '05dbda6a-4b19-4862-b4fc-205c78affb66',
      );
      // Well inside the budget: it returned on the id, not on the timeout.
      expect(Date.now() - startedAt).toBeLessThan(2500);
    } finally {
      delete process.env[AGENT_SESSION_TIMEOUT_MS_ENV];
    }
  }, 15_000);

  it('still waits (and fails) when a lingering child prints no id at all', async () => {
    // The early-return must not weaken the backstop: no id means no shortcut.
    process.env[CURSOR_AGENT_BIN_ENV] = writeFakeBin(
      'cursor-create-lingering-silent.js',
      `console.log('starting up');
      setInterval(() => {}, 1000000);`,
    );
    process.env[AGENT_SESSION_TIMEOUT_MS_ENV] = '400';

    try {
      await expect(createCursorAgentSession({ cwd: dir })).rejects.toThrow(
        'timed out',
      );
    } finally {
      delete process.env[AGENT_SESSION_TIMEOUT_MS_ENV];
    }
  }, 15_000);

  it('times out (killing the child) when create-chat hangs', async () => {
    // A create-chat that never prints and never exits.
    process.env[CURSOR_AGENT_BIN_ENV] = writeFakeBin(
      'cursor-create-hang.js',
      `setInterval(() => {}, 1000000);`,
    );
    process.env[AGENT_SESSION_TIMEOUT_MS_ENV] = '200';
    try {
      await expect(createCursorAgentSession({ cwd: dir })).rejects.toThrow(
        'timed out',
      );
    } finally {
      delete process.env[AGENT_SESSION_TIMEOUT_MS_ENV];
    }
  });
});
