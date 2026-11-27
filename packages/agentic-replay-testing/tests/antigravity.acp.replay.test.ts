/**
 * Replay recorded `agy acp` transcripts through the PRODUCTION ACP conversation
 * backend via `OPENTHROTTLE_ANTIGRAVITY_BIN`. agy mints its own session id
 * (`session/new`); a `.turn-2` transcript is a fresh process that resumes it
 * with `session/load`. Supervised, agy asks before a write: the permission
 * transcript's request is answered by the test (cancelled, as recorded).
 *
 * Only the deny path is recorded: the shared `permission-denied` scenario fails
 * if the write lands, so an allow answer cannot be recorded without changing
 * the scenario.
 */

import type {
  ConversationBackend,
  ConversationBackendRun,
} from '@openthrottle/agentic-conversation-backend';
import {
  ACP_IDLE_TTL_MS_ENV,
  CHAT_ACP_BACKENDS_ENV,
  CONVERSATION_STREAM_CHUNK_KINDS as KINDS,
  withAcpRouting,
} from '@openthrottle/agentic-conversation-backend';
import { afterEach, describe, expect, it } from 'vitest';

import {
  answerPermissions,
  ANTIGRAVITY_RECORDING_PROFILE,
  driveScenarioTurn,
  initialConversation,
  prepareAcpReplay,
  replayAcpFixture,
  replayFixturePath,
  withBinEnv,
} from '../src/index.ts';
import {
  countOf,
  kindsOf,
  replayAcpStrict,
  terminal,
  textOf,
  turnChunks,
} from './support/replay-assertions.ts';

const SIMPLE_TURN = replayFixturePath('antigravity', 'acp/simple-turn');

describe('antigravity acp replay', () => {
  it('simple-turn streams the reply and one session chunk', async () => {
    const result = await replayAcpStrict(SIMPLE_TURN);
    const chunks = turnChunks(result, 0);

    expect(textOf(chunks)).toBe('pong');
    expect(countOf(chunks, KINDS.session)).toBe(1);
    expect(terminal(chunks)?.error ?? null).toBeNull();
  });

  it('tool-use pairs the read with its result', async () => {
    const result = await replayAcpStrict(
      replayFixturePath('antigravity', 'acp/tool-use'),
    );
    const chunks = turnChunks(result, 0);

    expect(countOf(chunks, KINDS.toolCall)).toBe(1);
    expect(countOf(chunks, KINDS.toolResult)).toBe(1);
    expect(textOf(chunks)).toContain('Replay fixture notes');
  });

  it('multi-tool pairs both calls with results', async () => {
    const result = await replayAcpStrict(
      replayFixturePath('antigravity', 'acp/multi-tool'),
    );
    const chunks = turnChunks(result, 0);

    expect(countOf(chunks, KINDS.toolCall)).toBe(2);
    expect(countOf(chunks, KINDS.toolResult)).toBe(2);
    expect(textOf(chunks).trim()).toBe('1');
  });

  it('accept-edits writes without asking', async () => {
    const result = await replayAcpStrict(
      replayFixturePath('antigravity', 'acp/accept-edits'),
    );
    const chunks = turnChunks(result, 0);
    const methods = result.transcript.frames.map((frame) => {
      return frame.message.method;
    });

    expect(countOf(chunks, KINDS.toolCall)).toBe(
      countOf(chunks, KINDS.toolResult),
    );
    expect(countOf(chunks, KINDS.toolCall)).toBeGreaterThan(0);
    expect(methods).not.toContain('session/request_permission');
    expect(textOf(chunks)).toContain('done');
  });

  it('permission-denied raises a request, honours the refusal and ends the turn', async () => {
    const result = await replayAcpStrict(
      replayFixturePath('antigravity', 'acp/permission-denied'),
      answerPermissions(null),
    );
    const chunks = turnChunks(result, 0);
    const requests = chunks.filter((chunk) => {
      return chunk.kind === KINDS.permissionRequest;
    });

    // One chunk announces the request, one reports its resolution.
    expect(requests).toHaveLength(2);
    expect(requests.at(-1)?.metadata?.resolution).toEqual({
      optionId: null,
      outcome: 'cancelled',
    });
    expect(countOf(chunks, KINDS.toolCall)).toBe(1);
    expect(terminal(chunks)?.error ?? null).toBeNull();
  });

  it('permission-denied fails with an rpc report when the answer differs', async () => {
    const result = await replayAcpFixture({
      fixturePath: replayFixturePath('antigravity', 'acp/permission-denied'),
      idleTtlMs: undefined,
      onChunk: answerPermissions('allow'),
    });

    expect(result.report).toMatchObject({ kind: 'rpc', ok: false });
  });

  it('thinking streams the reasoning before the answer', async () => {
    const result = await replayAcpStrict(
      replayFixturePath('antigravity', 'acp/thinking'),
    );
    const chunks = turnChunks(result, 0);

    expect(countOf(chunks, KINDS.thinking)).toBeGreaterThan(0);
    expect(kindsOf(chunks).indexOf(KINDS.thinking)).toBeLessThan(
      kindsOf(chunks).indexOf(KINDS.text),
    );
    expect(textOf(chunks)).toBe('1289');
  });

  it('system-prompt follows the persona it was prefixed with', async () => {
    const result = await replayAcpStrict(
      replayFixturePath('antigravity', 'acp/system-prompt'),
    );
    const text = textOf(turnChunks(result, 0));

    expect(text.trim()).toBe('HELLO.');
  });

  it('resume keeps one warm process and recalls the first turn', async () => {
    const result = await replayAcpStrict(
      replayFixturePath('antigravity', 'acp/resume'),
    );

    expect(result.chunks).toHaveLength(2);
    expect(textOf(turnChunks(result, 0)).trim()).toBe('OK.');
    expect(textOf(turnChunks(result, 1)).trim()).toBe('heron');
  });

  it('resume.turn-2 resumes on a fresh process with session/load', async () => {
    const result = await replayAcpStrict(
      replayFixturePath('antigravity', 'acp/resume.turn-2'),
    );
    const methods = result.transcript.frames
      .filter((frame) => frame.from === 'client')
      .map((frame) => frame.message.method);

    expect(methods).toContain('session/load');
    expect(methods).not.toContain('session/new');
    expect(textOf(turnChunks(result, 0)).trim()).toBe('heron');
  });

  it('interrupt ends cancelled after partial text, with session/cancel asserted in order', async () => {
    const result = await replayAcpStrict(
      replayFixturePath('antigravity', 'acp/interrupt'),
    );
    const chunks = turnChunks(result, 0);
    const methods = result.transcript.frames.map((frame) => {
      return frame.message.method;
    });

    expect(methods).toContain('session/cancel');
    expect(textOf(chunks)).not.toBe('');
    expect(terminal(chunks)?.error).toBe('cancelled');
  });

  // Known defect: an unknown model id is silently ignored over ACP. The CLI
  // path rejects it (`error` ends naming the model); here `applyModel` finds no
  // matching `model` option, returns without a word, and the turn answers on
  // the default model: no `session/set_config_option`, `end_turn`.
  it('error: DEFECT - an unknown model is ignored, the turn succeeds', async () => {
    const result = await replayAcpStrict(
      replayFixturePath('antigravity', 'acp/error'),
    );
    const chunks = turnChunks(result, 0);
    const methods = result.transcript.frames.map((frame) => {
      return frame.message.method;
    });

    expect(result.transcript.header.model).toBe('not-a-real-model');
    expect(methods).not.toContain('session/set_config_option');
    expect(textOf(chunks)).toBe('pong');
    expect(terminal(chunks)?.error ?? null).toBeNull();
  });
});

describe('antigravity acp routing', () => {
  const original = process.env[CHAT_ACP_BACKENDS_ENV];

  afterEach(() => {
    if (original === undefined) {
      delete process.env[CHAT_ACP_BACKENDS_ENV];
    } else {
      process.env[CHAT_ACP_BACKENDS_ENV] = original;
    }
  });

  /** A CLI backend that records whether it was reached. */
  const cliStub = (): { backend: ConversationBackend; calls: () => number } => {
    let calls = 0;
    return {
      backend: {
        stream: (_run: ConversationBackendRun) => {
          calls += 1;
          return (async function* empty() {})();
        },
      },
      calls: () => calls,
    };
  };

  /** Drive simple-turn through `backend`; the replay bin is the antigravity binary. */
  const drive = async (
    backend: ConversationBackend,
    options: { readonly expectSpawn: boolean },
  ) => {
    const prepared = prepareAcpReplay(SIMPLE_TURN);
    const resolved = prepared.turns[0];
    if (resolved === undefined) {
      throw new Error('no turn');
    }
    try {
      return await withBinEnv(ACP_IDLE_TTL_MS_ENV, '200', async () => {
        return withBinEnv(
          ANTIGRAVITY_RECORDING_PROFILE.binEnv,
          prepared.bin,
          async () => {
            const chunks = await driveScenarioTurn(
              {
                ...ANTIGRAVITY_RECORDING_PROFILE,
                conversationBackend: backend,
              },
              {
                conversation: initialConversation(undefined),
                cwd: prepared.cwd,
                model: null,
                onChunk: undefined,
                resolved,
              },
            );
            if (options.expectSpawn) {
              expect(await prepared.waitForExit(10_000)).toBe(true);
              expect(prepared.readReport()).toEqual({ ok: true });
            }
            return chunks;
          },
        );
      });
    } finally {
      prepared.dispose();
    }
  };

  it('reaches the ACP path when OPENTHROTTLE_CHAT_ACP_BACKENDS names antigravity', async () => {
    process.env[CHAT_ACP_BACKENDS_ENV] = 'antigravity';
    const cli = cliStub();

    const chunks = await drive(withAcpRouting('antigravity', cli.backend), {
      expectSpawn: true,
    });

    expect(cli.calls()).toBe(0);
    expect(textOf(chunks)).toBe('pong');
  });

  it('stays on the CLI backend when the flag is unset', async () => {
    delete process.env[CHAT_ACP_BACKENDS_ENV];
    const cli = cliStub();

    await drive(withAcpRouting('antigravity', cli.backend), {
      expectSpawn: false,
    });

    expect(cli.calls()).toBe(1);
  });
});
