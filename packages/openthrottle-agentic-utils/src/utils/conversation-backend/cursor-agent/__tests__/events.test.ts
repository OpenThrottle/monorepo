import { describe, expect, it } from 'vitest';

import { mapCursorEvent } from '../events.ts';

// Fixtures are the verbatim shapes captured in
// docs/openthrottle/cursor-agent-stream-json-schema.md.
describe('mapCursorEvent', () => {
  it('maps system/init to a session-confirmation chunk', () => {
    expect(
      mapCursorEvent({
        cwd: '/x',
        model: 'Auto',
        session_id: '2a5f06af',
        subtype: 'init',
        type: 'system',
      }),
    ).toEqual({
      delta: '',
      done: false,
      kind: 'session',
      metadata: { sessionId: '2a5f06af' },
    });
  });

  it('maps a timestamped assistant event to a text delta', () => {
    expect(
      mapCursorEvent({
        message: {
          content: [{ text: 'hello', type: 'text' }],
          role: 'assistant',
        },
        timestamp_ms: 1781763222114,
        type: 'assistant',
      }),
    ).toEqual({ delta: 'hello', done: false, kind: 'text' });
  });

  it('skips the final consolidated assistant echo (no timestamp_ms)', () => {
    expect(
      mapCursorEvent({
        message: {
          content: [{ text: 'hello world', type: 'text' }],
          role: 'assistant',
        },
        type: 'assistant',
      }),
    ).toBeNull();
  });

  it('skips the per-segment consolidation cursor sends before a tool call', () => {
    // Captured from cursor-agent 2026.11.05 with --stream-partial-output: the
    // segment's deltas are followed by the whole segment again, stamped AND
    // carrying the model call id, right before the tool_call it precedes.
    expect(
      mapCursorEvent({
        message: {
          content: [{ text: 'I will read a.txt.', type: 'text' }],
          role: 'assistant',
        },
        model_call_id: '6682c08b-7090-4266-8405-3ef70106b9db-0-u48c',
        timestamp_ms: 1794089058731,
        type: 'assistant',
      }),
    ).toBeNull();
  });

  it('maps thinking delta to a thinking chunk and skips thinking completed', () => {
    expect(
      mapCursorEvent({ subtype: 'delta', text: 'Reading…', type: 'thinking' }),
    ).toEqual({ delta: 'Reading…', done: false, kind: 'thinking' });
    expect(
      mapCursorEvent({ subtype: 'completed', type: 'thinking' }),
    ).toBeNull();
  });

  it('maps tool_call started/completed, correlated by call_id', () => {
    const started = mapCursorEvent({
      call_id: 'tool_bf9e',
      subtype: 'started',
      tool_call: { readToolCall: { args: { path: '/x/alpha.txt' } } },
      type: 'tool_call',
    });
    expect(started).toMatchObject({ done: false, kind: 'tool_call' });
    expect(started?.metadata?.callId).toBe('tool_bf9e');
    // cursor names the tool with a KEY, so `readToolCall` resolves to `read`.
    expect(started?.metadata?.toolName).toBe('read');

    const completed = mapCursorEvent({
      call_id: 'tool_bf9e',
      subtype: 'completed',
      tool_call: { readToolCall: { result: { success: { content: 'hi' } } } },
      type: 'tool_call',
    });
    expect(completed).toMatchObject({ done: false, kind: 'tool_result' });
    expect(completed?.metadata?.callId).toBe('tool_bf9e');
    expect(completed?.metadata?.toolName).toBe('read');
  });

  describe('the card payload', () => {
    // A shell call as cursor-agent / auto streamed it in conversation aa2773ae.
    const shellArgs = {
      closeStdin: true,
      command: 'pwd',
      conversationId: '2061242f',
      description: 'Print working directory',
      hardTimeout: 86400000,
      isBackground: false,
      parsingResult: { executableCommands: [], hasRedirects: false },
      requestId: '582a227a',
      simpleCommands: ['pwd'],
      skipApproval: false,
      smartModeClassifierAllowed: false,
      timeout: 30000,
      timeoutBehavior: 'TIMEOUT_BEHAVIOR_BACKGROUND',
      toolCallId: 'call-0',
      workingDirectory: '',
    };
    const envelope = (shellToolCall: Record<string, unknown>) => {
      return {
        hookAdditionalContexts: [],
        shellToolCall,
        startedAtMs: '1793942882052',
        toolCallId: 'call-0',
      };
    };

    it('sends only the model-facing args on started', () => {
      const chunk = mapCursorEvent({
        call_id: 'call-0',
        subtype: 'started',
        tool_call: envelope({ args: shellArgs }),
        type: 'tool_call',
      });

      expect(chunk?.metadata).toEqual({
        callId: 'call-0',
        toolCall: {
          command: 'pwd',
          description: 'Print working directory',
          isBackground: false,
          timeout: 30000,
          workingDirectory: '',
        },
        toolName: 'shell',
      });
    });

    it('sends only the success output on completed', () => {
      const success = { exitCode: 0, stderr: '', stdout: '/repo\n' };
      const chunk = mapCursorEvent({
        call_id: 'call-0',
        subtype: 'completed',
        tool_call: envelope({ args: shellArgs, result: { success } }),
        type: 'tool_call',
      });

      expect(chunk?.metadata).toEqual({
        callId: 'call-0',
        toolCall: success,
        toolName: 'shell',
      });
    });

    it('unwraps a lone string content', () => {
      const chunk = mapCursorEvent({
        call_id: 'call-3',
        subtype: 'completed',
        tool_call: {
          getMcpToolsToolCall: {
            args: { pattern: 'health' },
            result: { success: { content: '{"matches":[]}' } },
          },
        },
        type: 'tool_call',
      });

      expect(chunk?.metadata?.toolCall).toBe('{"matches":[]}');
      expect(chunk?.metadata?.toolName).toBe('getMcpTools');
    });

    it('passes an unrecognized envelope through whole', () => {
      const toolCall = { toolCallId: 'call-9' };
      const chunk = mapCursorEvent({
        call_id: 'call-9',
        subtype: 'started',
        tool_call: toolCall,
        type: 'tool_call',
      });

      expect(chunk?.metadata).toEqual({
        callId: 'call-9',
        toolCall,
        toolName: null,
      });
    });
  });

  describe('a completed tool_call outcome', () => {
    // Result branches captured from conversation aa2773ae (cursor-agent / auto).
    const completed = (toolCall: Record<string, unknown>) => {
      return mapCursorEvent({
        call_id: 'call-1',
        subtype: 'completed',
        tool_call: { ...toolCall, toolCallId: 'call-1' },
        type: 'tool_call',
      });
    };

    it('leaves a success result unflagged', () => {
      const chunk = completed({
        getMcpToolsToolCall: {
          args: { pattern: 'health' },
          result: { success: { content: '{"matches":[]}' } },
        },
      });

      expect(chunk?.kind).toBe('tool_result');
      expect(chunk?.metadata?.isError).toBeUndefined();
    });

    it('flags an error result with its errorMessage', () => {
      const chunk = completed({
        readToolCall: {
          args: { path: '/x/missing.txt' },
          result: { error: { errorMessage: 'File not found' } },
        },
      });

      expect(chunk?.metadata).toMatchObject({
        callId: 'call-1',
        isError: true,
        toolCall: 'File not found',
        toolName: 'read',
      });
    });

    it('flags a rejection with its reason', () => {
      const chunk = completed({
        mcpToolCall: {
          args: { name: 'openthrottle-mcp-health' },
          result: {
            rejected: {
              isReadonly: false,
              reason: 'User rejected MCP: openthrottle-mcp-health',
            },
          },
        },
      });

      expect(chunk?.metadata).toMatchObject({
        isError: true,
        toolCall: 'User rejected MCP: openthrottle-mcp-health',
        toolName: 'mcp',
      });
    });

    it('flags a reasonless rejection with a readable fallback', () => {
      const chunk = completed({
        shellToolCall: {
          args: { command: 'pwd' },
          result: {
            rejected: { command: 'pwd', isReadonly: false, reason: '' },
          },
        },
      });

      expect(chunk?.metadata).toMatchObject({
        isError: true,
        toolCall: 'Rejected by cursor permissions',
        toolName: 'shell',
      });
    });
  });

  it('maps a success result to a terminal chunk with no error', () => {
    expect(
      mapCursorEvent({
        is_error: false,
        result: 'hello world',
        subtype: 'success',
        type: 'result',
        usage: { outputTokens: 35 },
      }),
    ).toMatchObject({ done: true, error: null, kind: 'usage' });
  });

  it('maps is_error:true to a terminal error chunk', () => {
    const chunk = mapCursorEvent({
      is_error: true,
      result: 'something failed',
      subtype: 'success',
      type: 'result',
    });
    expect(chunk).toMatchObject({ done: true, kind: 'usage' });
    expect(chunk?.error).toBe('something failed');
  });

  it('ignores the prompt echo and unknown events', () => {
    expect(
      mapCursorEvent({ message: { content: [], role: 'user' }, type: 'user' }),
    ).toBeNull();
    expect(mapCursorEvent({ type: 'rate_limit_event' })).toBeNull();
    expect(mapCursorEvent('not an object')).toBeNull();
  });
});
