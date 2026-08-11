import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { CLAUDE_BIN_ENV } from '../argv.ts';
import { CLAUDE_CONFIG_DIR_ENV, claudeConversationBackend } from '../claude.ts';
import { AGENT_IDLE_TIMEOUT_MS_ENV } from '../../cursor-agent/teardown.ts';
import {
  CONVERSATION_PERMISSION_MODES,
  CONVERSATION_STREAM_CHUNK_KINDS,
  type ConversationStreamChunk,
} from '../../types.ts';

let dir: string;

/** Write an executable node script and return its path. */
function writeFakeBin(name: string, body: string): string {
  const path = join(dir, name);
  writeFileSync(path, `#!/usr/bin/env node\n${body}\n`, 'utf8');
  chmodSync(path, 0o755);
  return path;
}

// A successful streamed turn: init → two nested text deltas → consolidated
// assistant echo (skipped) → result.
const successBin = (): string =>
  writeFakeBin(
    'claude-success.js',
    `const lines = [
      JSON.stringify({ type: 'system', subtype: 'init', session_id: 'sess-1', cwd: '/x', model: 'claude-opus-4-8' }),
      JSON.stringify({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'hello' } } }),
      JSON.stringify({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: ' world' } } }),
      JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'hello world' }] } }),
      JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'hello world', usage: { output_tokens: 5 }, total_cost_usd: 0.04 }),
    ];
    process.stdout.write(lines.join('\\n') + '\\n');`,
  );

// A startup failure: nothing on stdout, a message on stderr, non-zero exit.
const errorBin = (): string =>
  writeFakeBin(
    'claude-error.js',
    `process.stderr.write('Input must be provided\\n');
    process.exit(1);`,
  );

// Simulates an MCP tool call whose outcome depends on the permission grant in
// argv: with a grant (--allowedTools or bypassPermissions) it succeeds; without
// one it returns the headless "user declined the approval" is_error result —
// exactly the reported symptom. Lets a backend-level test prove the grant flips
// the outcome without invoking a real CLI.
const mcpToolBin = (): string =>
  writeFakeBin(
    'claude-mcp-tool.js',
    `const argv = process.argv.slice(2).join(' ');
    const granted = argv.includes('--allowedTools') || argv.includes('bypassPermissions');
    const toolResult = granted
      ? { type: 'tool_result', tool_use_id: 't1', is_error: false, content: 'plan created' }
      : { type: 'tool_result', tool_use_id: 't1', is_error: true, content: 'user declined the approval' };
    const lines = [
      JSON.stringify({ type: 'system', subtype: 'init', session_id: 'sess-1' }),
      JSON.stringify({ type: 'user', message: { role: 'user', content: [toolResult] } }),
      JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'done' }),
    ];
    process.stdout.write(lines.join('\\n') + '\\n');`,
  );

/** The first tool_result block carried by the tool_result chunk, if any. */
function firstToolResult(
  chunks: readonly ConversationStreamChunk[],
): Record<string, unknown> | undefined {
  const chunk = chunks.find(
    (candidate) =>
      candidate.kind === CONVERSATION_STREAM_CHUNK_KINDS.toolResult,
  );
  const results = chunk?.metadata?.['toolResults'];
  const block = Array.isArray(results) ? results[0] : undefined;
  return typeof block === 'object' && block !== null ? block : undefined;
}

const MCP_SERVERS = {
  'openthrottle-mcp': {
    args: ['./scripts/run-openthrottle-mcp.sh'],
    command: 'bash',
  },
};

// Emits one event, then hangs (no result, no further output) until killed.
const hangBin = (): string =>
  writeFakeBin(
    'claude-hang.js',
    `process.stdout.write(JSON.stringify({ type: 'system', subtype: 'init', session_id: 'sess-1' }) + '\\n');
    setInterval(() => {}, 1000000);`,
  );

// Emits ONLY null-mapped liveness events (system/hook_*, rate_limit_event) —
// each on its own stdout write (own data event) — before finally streaming text
// and a terminal result. Models the reported defect: `claude` is alive and
// emitting stdout (its own 120s idle never fires), but mapClaudeEvent returns
// null for these events, so nothing reaches the server's chunk-based idle timer.
const keepaliveBin = (): string =>
  writeFakeBin(
    'claude-keepalive.js',
    `const emit = (o) => process.stdout.write(JSON.stringify(o) + '\\n');
    emit({ type: 'system', subtype: 'hook_started', hook: 'SessionStart' });
    setTimeout(() => {
      emit({ type: 'rate_limit_event', status: 'throttled' });
      setTimeout(() => {
        emit({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'hi' } } });
        emit({ type: 'result', subtype: 'success', is_error: false, result: 'hi' });
      }, 25);
    }, 25);`,
  );

// Echoes the CLAUDE_CONFIG_DIR the child was spawned with (or 'none'), so a test
// can assert whether the headless turn was isolated onto a dedicated config dir.
const configDirBin = (): string =>
  writeFakeBin(
    'claude-configdir.js',
    `const configDir = process.env.CLAUDE_CONFIG_DIR || 'none';
    process.stdout.write(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: configDir }) + '\\n');`,
  );

async function collect(
  run: Parameters<typeof claudeConversationBackend.stream>[0],
): Promise<ConversationStreamChunk[]> {
  const chunks: ConversationStreamChunk[] = [];
  for await (const chunk of claudeConversationBackend.stream(run)) {
    chunks.push(chunk);
  }
  return chunks;
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'claude-adapter-'));
});

afterAll(() => {
  rmSync(dir, { force: true, recursive: true });
  delete process.env[CLAUDE_BIN_ENV];
});

describe('claudeConversationBackend', () => {
  it('spawns, parses nested NDJSON, and yields session + text deltas + terminal (skipping the assistant echo)', async () => {
    process.env[CLAUDE_BIN_ENV] = successBin();

    const chunks = await collect({
      cwd: dir,
      messages: [{ content: 'hi', role: 'user' }],
      model: 'claude-opus-4-8',
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
    expect(terminal?.metadata?.result).toBe('hello world');
  });

  it('emits keepalive liveness chunks for null-mapped-but-alive stdout so the server idle backstop tracks the CLI stdout timer', async () => {
    process.env[CLAUDE_BIN_ENV] = keepaliveBin();

    const chunks = await collect({
      cwd: dir,
      messages: [{ content: 'hi', role: 'user' }],
      model: 'auto',
      sessionId: 'sess-1',
    });

    const kinds = chunks.map((chunk) => chunk.kind);
    // Without keepalive emission the null-mapped events (hook_started,
    // rate_limit_event) produce NO chunk, so the server's chunk-based idle timer
    // sees no activity and trips mid-turn. A keepalive stands in for the quiet.
    expect(kinds).toContain(CONVERSATION_STREAM_CHUNK_KINDS.keepalive);
    // Keepalives are pure liveness: empty delta, non-terminal, no payload.
    const keepalive = chunks.find(
      (chunk) => chunk.kind === CONVERSATION_STREAM_CHUNK_KINDS.keepalive,
    );
    expect(keepalive).toMatchObject({ delta: '', done: false });
    // A keepalive precedes the first real text (it covered a quiet stretch).
    expect(
      kinds.indexOf(CONVERSATION_STREAM_CHUNK_KINDS.keepalive),
    ).toBeLessThan(kinds.indexOf(CONVERSATION_STREAM_CHUNK_KINDS.text));
    // The turn still completes normally with its text + terminal result.
    expect(chunks.some((chunk) => chunk.delta === 'hi')).toBe(true);
    expect(chunks.at(-1)).toMatchObject({ done: true, error: null });
  });

  it('synthesizes a terminal error chunk from stderr when the process fails with no result', async () => {
    process.env[CLAUDE_BIN_ENV] = errorBin();

    const chunks = await collect({
      cwd: dir,
      messages: [{ content: 'hi', role: 'user' }],
      model: 'auto',
      sessionId: 'sess-1',
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ done: true });
    expect(chunks[0]?.error).toContain('Input must be provided');
  });

  it('requires cwd and sessionId', async () => {
    process.env[CLAUDE_BIN_ENV] = successBin();
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
    process.env[CLAUDE_BIN_ENV] = writeFakeBin(
      'claude-env.js',
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

  it('isolates a headless turn onto a dedicated CLAUDE_CONFIG_DIR when OPENTHROTTLE_CLAUDE_CONFIG_DIR is set (skips user plugin hooks)', async () => {
    process.env[CLAUDE_BIN_ENV] = configDirBin();
    const isolated = join(dir, 'isolated-claude-config');
    process.env[CLAUDE_CONFIG_DIR_ENV] = isolated;
    try {
      const chunks = await collect({
        cwd: dir,
        messages: [{ content: 'hi', role: 'user' }],
        model: 'auto',
        sessionId: 'sess-1',
      });
      expect(chunks.at(-1)?.metadata?.result).toBe(isolated);
    } finally {
      delete process.env[CLAUDE_CONFIG_DIR_ENV];
    }
  });

  it('leaves CLAUDE_CONFIG_DIR unset by default so subscription auth on the real config dir is preserved', async () => {
    process.env[CLAUDE_BIN_ENV] = configDirBin();
    const previous = process.env.CLAUDE_CONFIG_DIR;
    delete process.env.CLAUDE_CONFIG_DIR;
    delete process.env[CLAUDE_CONFIG_DIR_ENV];
    try {
      const chunks = await collect({
        cwd: dir,
        messages: [{ content: 'hi', role: 'user' }],
        model: 'auto',
        sessionId: 'sess-1',
      });
      expect(chunks.at(-1)?.metadata?.result).toBe('none');
    } finally {
      if (previous !== undefined) {
        process.env.CLAUDE_CONFIG_DIR = previous;
      }
    }
  });

  it('passes the run mcpEnv (OT MCP token + API URLs) through to the child on top of the allowlist', async () => {
    process.env[CLAUDE_BIN_ENV] = writeFakeBin(
      'claude-mcpenv.js',
      `const token = process.env.OPENTHROTTLE_MCP_AUTH_TOKEN || 'none';
      const url = process.env.API_URL || 'none';
      process.stdout.write(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: token + '|' + url }) + '\\n');`,
    );

    const chunks = await collect({
      cwd: dir,
      mcpEnv: {
        API_URL: 'http://localhost:6021',
        API_URL_INTERNAL: 'http://localhost:6021',
        OPENTHROTTLE_MCP_AUTH_TOKEN: 'ot_sa_test',
      },
      mcpServers: {
        'openthrottle-mcp': {
          args: ['./scripts/run-openthrottle-mcp.sh'],
          command: 'bash',
        },
      },
      messages: [{ content: 'hi', role: 'user' }],
      model: 'auto',
      sessionId: 'sess-1',
    });

    expect(chunks.at(-1)?.metadata?.result).toBe(
      'ot_sa_test|http://localhost:6021',
    );
  });

  it('kills a hung process on the idle timeout and yields an idle-timeout error', async () => {
    process.env[CLAUDE_BIN_ENV] = hangBin();
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

  it('default posture: a managed MCP tool call is NOT auto-declined', async () => {
    process.env[CLAUDE_BIN_ENV] = mcpToolBin();

    const chunks = await collect({
      cwd: dir,
      mcpServers: MCP_SERVERS,
      messages: [{ content: 'create a plan', role: 'user' }],
      model: 'auto',
      sessionId: 'sess-1',
    });

    const block = firstToolResult(chunks);
    expect(block).toBeDefined();
    expect(block?.['is_error']).not.toBe(true);
    expect(JSON.stringify(block)).not.toContain('declined');
  });

  it('fullAccess posture: a managed MCP tool call is NOT auto-declined', async () => {
    process.env[CLAUDE_BIN_ENV] = mcpToolBin();

    const chunks = await collect({
      cwd: dir,
      mcpServers: MCP_SERVERS,
      messages: [{ content: 'create a plan', role: 'user' }],
      model: 'auto',
      permissionMode: CONVERSATION_PERMISSION_MODES.fullAccess,
      sessionId: 'sess-1',
    });

    const block = firstToolResult(chunks);
    expect(block?.['is_error']).not.toBe(true);
    expect(JSON.stringify(block)).not.toContain('declined');
  });

  it('control: with no permission grant the same tool call IS declined (reproduces the reported symptom)', async () => {
    process.env[CLAUDE_BIN_ENV] = mcpToolBin();

    const chunks = await collect({
      cwd: dir,
      messages: [{ content: 'create a plan', role: 'user' }],
      model: 'auto',
      sessionId: 'sess-1',
    });

    const block = firstToolResult(chunks);
    expect(block?.['is_error']).toBe(true);
    expect(JSON.stringify(block)).toContain('declined');
  });

  it('tears down the child and yields a cancelled error when the signal aborts', async () => {
    process.env[CLAUDE_BIN_ENV] = hangBin();
    const controller = new AbortController();

    const chunks: ConversationStreamChunk[] = [];
    for await (const chunk of claudeConversationBackend.stream({
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
