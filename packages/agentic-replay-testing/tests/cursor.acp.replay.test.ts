/**
 * Replay recorded `cursor-agent acp` transcripts through the PRODUCTION ACP
 * conversation backend via `OPENTHROTTLE_CURSOR_AGENT_BIN`. The agent mints its
 * own session id (`session/new`); a `.turn-2` transcript is a fresh process
 * that resumes it with `session/load`.
 *
 * `permission-denied` has no ACP transcript: cursor applies an edit without
 * raising `session/request_permission` even in the supervised posture, so the
 * write lands and the recorder refuses the scenario (`a denied write happened
 * (out.txt)`), as it did for the CLI. The thinking transcript still carries one
 * real permission exchange (a shell command, auto-refused by the backend).
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
  CURSOR_RECORDING_PROFILE,
  driveScenarioTurn,
  initialConversation,
  prepareAcpReplay,
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

const SIMPLE_TURN = replayFixturePath('cursor', 'acp/simple-turn');

describe('cursor acp replay', () => {
  it('simple-turn streams thinking, then the reply, then a clean end', async () => {
    const result = await replayAcpStrict(SIMPLE_TURN);
    const chunks = turnChunks(result, 0);

    expect(textOf(chunks)).toBe('pong');
    expect(countOf(chunks, KINDS.session)).toBe(1);
    expect(kindsOf(chunks).indexOf(KINDS.thinking)).toBeLessThan(
      kindsOf(chunks).indexOf(KINDS.text),
    );
    expect(terminal(chunks)?.error ?? null).toBeNull();
  });

  it('tool-use pairs each call with its result', async () => {
    const result = await replayAcpStrict(
      replayFixturePath('cursor', 'acp/tool-use'),
    );
    const chunks = turnChunks(result, 0);

    expect(countOf(chunks, KINDS.toolCall)).toBeGreaterThan(0);
    expect(countOf(chunks, KINDS.toolCall)).toBe(
      countOf(chunks, KINDS.toolResult),
    );
    expect(textOf(chunks)).toContain('Replay fixture notes');
  });

  it('multi-tool pairs both calls with results', async () => {
    const result = await replayAcpStrict(
      replayFixturePath('cursor', 'acp/multi-tool'),
    );
    const chunks = turnChunks(result, 0);

    expect(countOf(chunks, KINDS.toolCall)).toBe(2);
    expect(countOf(chunks, KINDS.toolResult)).toBe(2);
    expect(textOf(chunks).trim().endsWith('1')).toBe(true);
  });

  it('accept-edits lets the edit through without asking', async () => {
    const result = await replayAcpStrict(
      replayFixturePath('cursor', 'acp/accept-edits'),
    );
    const chunks = turnChunks(result, 0);
    const methods = result.transcript.frames.map((frame) => {
      return frame.message.method;
    });

    expect(countOf(chunks, KINDS.toolCall)).toBe(1);
    expect(countOf(chunks, KINDS.toolResult)).toBe(1);
    expect(methods).not.toContain('session/request_permission');
    expect(textOf(chunks)).toContain('done');
  });

  it('thinking streams the reasoning before the answer and replays its refused shell command', async () => {
    const result = await replayAcpStrict(
      replayFixturePath('cursor', 'acp/thinking'),
    );
    const chunks = turnChunks(result, 0);
    const answers = result.transcript.frames.filter((frame) => {
      return frame.from === 'client' && !('method' in frame.message);
    });

    expect(kindsOf(chunks).indexOf(KINDS.thinking)).toBeLessThan(
      kindsOf(chunks).indexOf(KINDS.text),
    );
    expect(countOf(chunks, KINDS.thinking)).toBeGreaterThan(0);
    // The backend refuses an unlisted shell command outside a supervised or
    // full-access turn, and the recorded answer is asserted frame for frame.
    expect(answers.map((frame) => frame.message.result)).toEqual([
      { outcome: { optionId: 'reject-once', outcome: 'selected' } },
    ]);
    expect(terminal(chunks)?.error ?? null).toBeNull();
  });

  it('system-prompt follows the persona it was prefixed with', async () => {
    const result = await replayAcpStrict(
      replayFixturePath('cursor', 'acp/system-prompt'),
    );
    const text = textOf(turnChunks(result, 0));
    const prompt = result.transcript.frames.find((frame) => {
      return frame.message.method === 'session/prompt';
    });

    expect(text).toBe(text.toUpperCase());
    expect(text).toContain('HELLO');
    // ACP has no system-prompt channel: the persona travels in the prompt text.
    expect(JSON.stringify(prompt?.message.params)).toContain(
      'You are terse. Always answer in uppercase.',
    );
  });

  it('resume keeps one warm process and recalls the first turn', async () => {
    const result = await replayAcpStrict(
      replayFixturePath('cursor', 'acp/resume'),
    );
    const methods = result.transcript.frames
      .filter((frame) => frame.from === 'client')
      .map((frame) => frame.message.method);

    expect(result.chunks).toHaveLength(2);
    expect(methods.filter((m) => m === 'session/new')).toHaveLength(1);
    expect(methods.filter((m) => m === 'session/load')).toHaveLength(0);
    expect(textOf(turnChunks(result, 1)).toLowerCase()).toContain('heron');
  });

  it('resume.turn-2 resumes on a fresh process with session/load', async () => {
    const result = await replayAcpStrict(
      replayFixturePath('cursor', 'acp/resume.turn-2'),
    );
    const methods = result.transcript.frames
      .filter((frame) => frame.from === 'client')
      .map((frame) => frame.message.method);

    expect(methods).toContain('session/load');
    expect(methods).not.toContain('session/new');
    expect(textOf(turnChunks(result, 0)).toLowerCase()).toContain('heron');
  });

  it('interrupt ends cancelled after partial text, with session/cancel asserted in order', async () => {
    const result = await replayAcpStrict(
      replayFixturePath('cursor', 'acp/interrupt'),
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
  // path rejects it (`error` ends with the CLI's message naming the model);
  // here `applyModel` finds no matching `model` option, returns without a
  // word, and the turn answers on the default model. The transcript has no
  // `session/set_config_option` at all and ends `end_turn`.
  it('error: DEFECT - an unknown model is ignored, the turn succeeds', async () => {
    const result = await replayAcpStrict(
      replayFixturePath('cursor', 'acp/error'),
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

describe('cursor acp routing', () => {
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

  /** Drive simple-turn through `backend`; the replay bin is the cursor binary. */
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
          CURSOR_RECORDING_PROFILE.binEnv,
          prepared.bin,
          async () => {
            const chunks = await driveScenarioTurn(
              { ...CURSOR_RECORDING_PROFILE, conversationBackend: backend },
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

  it('reaches the ACP path when OPENTHROTTLE_CHAT_ACP_BACKENDS names cursor', async () => {
    process.env[CHAT_ACP_BACKENDS_ENV] = 'cursor';
    const cli = cliStub();

    const chunks = await drive(withAcpRouting('cursor', cli.backend), {
      expectSpawn: true,
    });

    expect(cli.calls()).toBe(0);
    expect(textOf(chunks)).toBe('pong');
  });

  it('stays on the CLI backend when the flag is unset', async () => {
    delete process.env[CHAT_ACP_BACKENDS_ENV];
    const cli = cliStub();

    await drive(withAcpRouting('cursor', cli.backend), { expectSpawn: false });

    expect(cli.calls()).toBe(1);
  });
});
