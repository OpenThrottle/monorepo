import { describe, expect, it } from 'vitest';

import type { ConversationStreamChunk } from '../../types/conversation-backend.ts';
import { createGrokEventMapper } from '../createGrokEventMapper.ts';
import {
  GROK_1_PARALLEL_TOOL_CALL_EVENTS,
  GROK_1_PERMISSION_CANCELLED_EVENTS,
} from './grok-1-tool-calls.fixture.ts';

/** Map one event through a fresh mapper (the stateless events need no history). */
const mapGrokEvent = (event: unknown): ConversationStreamChunk[] => {
  return createGrokEventMapper().map(event);
};

/** Map a whole captured stream through ONE mapper, as a run does. */
const mapStream = (events: readonly unknown[]): ConversationStreamChunk[] => {
  const mapper = createGrokEventMapper();

  return events.flatMap((event) => {
    return mapper.map(event);
  });
};

const toolChunks = (
  chunks: readonly ConversationStreamChunk[],
): ConversationStreamChunk[] => {
  return chunks.filter((chunk) => {
    return chunk.kind === 'tool_call' || chunk.kind === 'tool_result';
  });
};

describe('createGrokEventMapper', () => {
  it('maps a thought event to a thinking delta', () => {
    expect(mapGrokEvent({ data: 'hmm', type: 'thought' })).toEqual([
      { delta: 'hmm', done: false, kind: 'thinking' },
    ]);
  });

  it('maps a text event to a text delta', () => {
    expect(mapGrokEvent({ data: 'pong', type: 'text' })).toEqual([
      { delta: 'pong', done: false, kind: 'text' },
    ]);
  });

  it('maps end to a session chunk then a terminal usage chunk', () => {
    const chunks = mapGrokEvent({
      modelUsage: { 'grok-4.5': { inputTokens: 10 } },
      num_turns: 1,
      sessionId: 'ses-1',
      stopReason: 'EndTurn',
      type: 'end',
      usage: { output_tokens: 3, total_tokens: 13 },
    });

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({
      done: false,
      kind: 'session',
      metadata: { sessionId: 'ses-1' },
    });
    expect(chunks[1]).toMatchObject({
      done: true,
      error: null,
      kind: 'usage',
      metadata: {
        stopReason: 'EndTurn',
        usage: { output_tokens: 3, total_tokens: 13 },
      },
    });
  });

  it('omits the session chunk when end carries no sessionId', () => {
    const chunks = mapGrokEvent({ type: 'end', usage: {} });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ done: true, kind: 'usage' });
  });

  it('maps a defensive error event to a terminal error chunk', () => {
    expect(mapGrokEvent({ message: 'boom', type: 'error' })).toEqual([
      { delta: '', done: true, error: 'boom', kind: 'text' },
    ]);
  });

  it('skips unknown events and non-objects', () => {
    expect(mapGrokEvent({ type: 'tool_use' })).toEqual([]);
    expect(mapGrokEvent('nope')).toEqual([]);
  });

  // A REAL captured grok streaming-json stream (grok 0.2.112). Verifies the full
  // turn maps to: thinking deltas, a text delta, then session + terminal usage.
  it('maps a real captured streaming-json turn end-to-end', () => {
    const raw = [
      { data: 'The', type: 'thought' },
      { data: ' answer', type: 'thought' },
      { data: 'pong', type: 'text' },
      {
        modelUsage: {
          'grok-4.5-build-free': {
            cacheReadInputTokens: 128,
            inputTokens: 14537,
            modelCalls: 1,
            outputTokens: 35,
          },
        },
        num_turns: 1,
        requestId: 'e44cad70-f10f-404d-94e6-2d15aed0e691',
        sessionId: '019fab66-1cd3-70b1-af22-f7dd9554d380',
        stopReason: 'EndTurn',
        type: 'end',
        usage: {
          cache_read_input_tokens: 128,
          input_tokens: 14537,
          output_tokens: 35,
          reasoning_tokens: 34,
          total_tokens: 14700,
        },
      },
    ];

    const chunks = mapStream(raw);

    expect(chunks.map((c) => c.kind)).toEqual([
      'thinking',
      'thinking',
      'text',
      'session',
      'usage',
    ]);
    expect(chunks.find((c) => c.kind === 'text')?.delta).toBe('pong');
    expect(chunks.find((c) => c.kind === 'session')?.metadata?.sessionId).toBe(
      '019fab66-1cd3-70b1-af22-f7dd9554d380',
    );
    const terminal = chunks.at(-1);
    expect(terminal).toMatchObject({ done: true, error: null });
  });

  describe('grok 1.x tool calls (captured stream)', () => {
    const PWD = 'call-eed840fc-58e4-45ad-9164-9e984ae89b86-0';
    const READ = 'call-eed840fc-58e4-45ad-9164-9e984ae89b86-1';
    const MISSING = 'call-eed840fc-58e4-45ad-9164-9e984ae89b86-2';

    it('opens each parallel call once, then closes each once, keyed by its own id', () => {
      const tools = toolChunks(mapStream(GROK_1_PARALLEL_TOOL_CALL_EVENTS));

      expect(
        tools.map((chunk) => {
          return [chunk.kind, chunk.metadata?.callId];
        }),
      ).toEqual([
        ['tool_call', PWD],
        ['tool_call', READ],
        ['tool_call', MISSING],
        ['tool_result', MISSING],
        ['tool_result', READ],
        ['tool_result', PWD],
      ]);
    });

    it('carries the rawInput as the arguments and the toolName as the name', () => {
      const tools = toolChunks(mapStream(GROK_1_PARALLEL_TOOL_CALL_EVENTS));

      expect(tools[0]?.metadata).toEqual({
        callId: PWD,
        toolCall: {
          command: 'pwd',
          description: 'Print the current working directory',
        },
        toolName: 'run_terminal_command',
      });
      expect(tools[1]?.metadata?.toolCall).toEqual({
        limit: 3,
        target_file: 'package.json',
      });
    });

    it('uses the terminal content text as the result, not the description', () => {
      const result = toolChunks(
        mapStream(GROK_1_PARALLEL_TOOL_CALL_EVENTS),
      ).find((chunk) => {
        return chunk.kind === 'tool_result' && chunk.metadata?.callId === PWD;
      });

      expect(result).toMatchObject({
        error: null,
        metadata: { isError: false, toolCall: '/repo\n' },
      });
    });

    it('marks a failed call isError with its error text', () => {
      const result = toolChunks(
        mapStream(GROK_1_PARALLEL_TOOL_CALL_EVENTS),
      ).find((chunk) => {
        return (
          chunk.kind === 'tool_result' && chunk.metadata?.callId === MISSING
        );
      });

      expect(result?.metadata?.isError).toBe(true);
      expect(result?.error).toContain('missing.txt does not exist');
      expect(result?.metadata?.toolCall).toBe(result?.error);
    });

    it('maps the permission-cancelled call as failed', () => {
      const results = toolChunks(
        mapStream(GROK_1_PERMISSION_CANCELLED_EVENTS),
      ).filter((chunk) => {
        return chunk.kind === 'tool_result';
      });

      expect(
        results.map((chunk) => {
          return chunk.metadata?.isError;
        }),
      ).toEqual([true, false]);
      expect(results[0]?.error).toBe(
        'User cancelled the execution for tool `run_terminal_command`',
      );
    });

    it('ends a permission-cancelled turn with an error naming the blocked tool', () => {
      const terminal = mapStream(GROK_1_PERMISSION_CANCELLED_EVENTS).at(-1);

      expect(terminal).toMatchObject({
        done: true,
        kind: 'usage',
        metadata: { stopReason: 'cancelled' },
      });
      expect(terminal?.error).toContain(
        '`run_terminal_command` needed approval',
      );
      expect(terminal?.error).toContain('Permissions');
    });

    it('keeps a cancelled turn with no blocked tool generic', () => {
      expect(
        mapGrokEvent({ stopReason: 'cancelled', type: 'end' })[0]?.error,
      ).toBe('grok cancelled the turn before it finished.');
    });

    it('leaves a normal end_turn error-free', () => {
      expect(mapStream(GROK_1_PARALLEL_TOOL_CALL_EVENTS).at(-1)).toMatchObject({
        done: true,
        error: null,
        kind: 'usage',
      });
    });

    it('ignores available_commands and the per-request usage event', () => {
      expect(
        mapGrokEvent({ tools: ['read_file'], type: 'available_commands' }),
      ).toEqual([]);
      expect(mapGrokEvent({ type: 'usage', usage: {} })).toEqual([]);
    });

    it('unwraps an MCP call result, which carries no content', () => {
      const mapper = createGrokEventMapper();
      mapper.map({
        rawInput: { tool_input: {}, tool_name: 'openthrottle-mcp__health' },
        status: 'pending',
        toolCallId: 'm1',
        toolName: 'use_tool',
        type: 'tool_call',
      });

      expect(
        mapper.map({
          content: [],
          rawOutput: { output: { OkayOutput: 'api: ok' }, type: 'MCP' },
          status: 'completed',
          toolCallId: 'm1',
          type: 'tool_call_update',
        })[0]?.metadata,
      ).toEqual({
        callId: 'm1',
        isError: false,
        toolCall: 'api: ok',
        toolName: 'use_tool',
      });
    });

    it('opens a card for a terminal update whose call was never announced', () => {
      expect(
        createGrokEventMapper()
          .map({
            content: [],
            status: 'completed',
            toolCallId: 'orphan',
            type: 'tool_call_update',
          })
          .map((chunk) => {
            return chunk.kind;
          }),
      ).toEqual(['tool_call', 'tool_result']);
    });

    it('emits nothing for a repeated terminal update', () => {
      const mapper = createGrokEventMapper();
      const update = {
        content: [],
        status: 'completed',
        toolCallId: 'x',
        type: 'tool_call_update',
      };
      mapper.map(update);

      expect(mapper.map(update)).toEqual([]);
    });
  });
});
