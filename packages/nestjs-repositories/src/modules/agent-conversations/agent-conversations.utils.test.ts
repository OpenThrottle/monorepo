import { isRecord } from '@openthrottle/nodejs-utils';
import { describe, expect, it } from 'vitest';

import {
  AGENT_CONVERSATION_PAYLOAD_TRUNCATED_KEY,
  AGENT_CONVERSATION_TOOL_METADATA_MAX_BYTES,
} from './agent-conversations.constants.ts';
import {
  capAgentConversationContent,
  capAgentConversationToolMetadata,
  clampAgentConversationListLimit,
  clampAgentConversationMessagesLimit,
  deriveConversationTitleFromMessage,
} from './agent-conversations.utils.ts';

describe('deriveConversationTitleFromMessage', () => {
  it('returns trimmed content when within 80 characters', () => {
    expect(deriveConversationTitleFromMessage('  hello world  ')).toBe(
      'hello world',
    );
  });

  it('truncates long content with an ellipsis', () => {
    const long = 'a'.repeat(100);
    expect(deriveConversationTitleFromMessage(long)).toHaveLength(81);
    expect(deriveConversationTitleFromMessage(long).endsWith('…')).toBe(true);
  });
});

describe('capAgentConversationContent', () => {
  it('returns content unchanged when under the byte cap', () => {
    expect(capAgentConversationContent('hello')).toEqual({
      content: 'hello',
      contentTruncated: false,
    });
  });

  it('truncates content that exceeds the byte cap', () => {
    const long = 'x'.repeat(300_000);
    const result = capAgentConversationContent(long);

    expect(result.contentTruncated).toBe(true);
    expect(Buffer.byteLength(result.content, 'utf8')).toBeLessThanOrEqual(
      256 * 1024,
    );
  });

  it('never splits a multibyte code point at the cap boundary', () => {
    // 4-byte emoji; 256 KiB is not a multiple of 4, so a byte-side cut lands
    // mid-code-point unless the truncation backs off to a boundary.
    const emoji = '😀';
    const long = emoji.repeat(80_000);
    const result = capAgentConversationContent(long);

    expect(result.contentTruncated).toBe(true);
    expect(Buffer.byteLength(result.content, 'utf8')).toBeLessThanOrEqual(
      256 * 1024,
    );
    expect(result.content.includes('�')).toBe(false);
    // Round-trips cleanly: decoding produced no replacement characters.
    expect(Buffer.from(result.content, 'utf8').toString('utf8')).toBe(
      result.content,
    );
  });
});

describe('capAgentConversationToolMetadata', () => {
  it('returns null metadata unchanged', () => {
    expect(capAgentConversationToolMetadata(null)).toEqual({
      toolMetadata: null,
      toolMetadataTruncated: false,
    });
  });

  it('sets truncated in the envelope when metadata exceeds the cap', () => {
    const large = {
      payload: 'x'.repeat(AGENT_CONVERSATION_TOOL_METADATA_MAX_BYTES),
    };
    const result = capAgentConversationToolMetadata(large);

    expect(result.toolMetadataTruncated).toBe(true);
    expect(result.toolMetadata).toMatchObject({ truncated: true });
  });

  it('returns metadata under the cap unchanged', () => {
    const small = { events: [{ delta: '', kind: 'session' }] };

    expect(capAgentConversationToolMetadata(small)).toEqual({
      toolMetadata: small,
      toolMetadataTruncated: false,
    });
  });

  describe('when an events envelope is over the cap', () => {
    const toolCallEvent = (callId: string): Record<string, unknown> => {
      return {
        delta: '',
        kind: 'tool_call',
        metadata: {
          callId,
          toolCall: { command: `echo ${callId}` },
          toolName: 'Bash',
        },
      };
    };

    const toolResultEvent = (
      callId: string,
      output: string,
      isError = false,
    ): Record<string, unknown> => {
      return {
        delta: '',
        kind: 'tool_result',
        metadata: { callId, isError, toolCall: output },
      };
    };

    const largeOutput = 'y'.repeat(200 * 1024);
    const events = [
      { delta: '', kind: 'session', metadata: { sessionId: 'sess-1' } },
      toolCallEvent('call-a'),
      toolCallEvent('call-big'),
      toolCallEvent('call-b'),
      toolResultEvent('call-a', 'alpha'),
      toolResultEvent('call-big', largeOutput),
      toolResultEvent('call-b', 'boom', true),
      {
        delta: '',
        kind: 'usage',
        metadata: { usage: { input_tokens: 12, output_tokens: 34 } },
      },
    ];

    const result = capAgentConversationToolMetadata({ events });
    const capped = result.toolMetadata;
    const cappedEvents: readonly unknown[] =
      capped !== null && Array.isArray(capped.events) ? capped.events : [];

    it('fits the cap and flags the envelope truncated', () => {
      expect(result.toolMetadataTruncated).toBe(true);
      expect(capped).toMatchObject({ truncated: true });
      expect(
        Buffer.byteLength(JSON.stringify(capped), 'utf8'),
      ).toBeLessThanOrEqual(AGENT_CONVERSATION_TOOL_METADATA_MAX_BYTES);
    });

    it('keeps every small event byte-for-byte, usage included', () => {
      expect(cappedEvents).toHaveLength(events.length);
      expect(cappedEvents.slice(0, 5)).toEqual(events.slice(0, 5));
      expect(cappedEvents.slice(6)).toEqual(events.slice(6));
    });

    it('clips only the oversized payload to a prefix, flagged on its metadata', () => {
      const clipped = cappedEvents[5];
      const rawMetadata = isRecord(clipped) ? clipped.metadata : null;
      const metadata = isRecord(rawMetadata) ? rawMetadata : {};
      const output = metadata.toolCall;

      expect(clipped).toMatchObject({ kind: 'tool_result' });
      expect(metadata).toMatchObject({
        [AGENT_CONVERSATION_PAYLOAD_TRUNCATED_KEY]: true,
        callId: 'call-big',
        isError: false,
      });
      expect(typeof output).toBe('string');
      if (typeof output !== 'string') {
        return;
      }

      expect(largeOutput.startsWith(output)).toBe(true);
      // The shared limit spends nearly the whole cap on the one big payload.
      expect(output.length).toBeGreaterThan(60 * 1024);
    });
  });

  it('clips an oversized object payload to its JSON text', () => {
    const args = { content: 'z'.repeat(100 * 1024), file_path: '/tmp/a.ts' };
    const result = capAgentConversationToolMetadata({
      events: [
        {
          delta: '',
          kind: 'tool_call',
          metadata: { callId: 'c1', toolCall: args, toolName: 'Write' },
        },
      ],
    });

    expect(result.toolMetadata).toMatchObject({
      events: [
        {
          kind: 'tool_call',
          metadata: {
            [AGENT_CONVERSATION_PAYLOAD_TRUNCATED_KEY]: true,
            callId: 'c1',
            toolCall: expect.stringMatching(/^\{"content":"z+$/),
            toolName: 'Write',
          },
        },
      ],
      truncated: true,
    });
  });

  it('falls back to a bare truncated marker when the skeleton alone is over the cap', () => {
    const events = Array.from({ length: 5000 }, (_, index) => ({
      delta: '',
      kind: 'tool_call',
      metadata: { callId: `call-${index}`, toolName: 'Bash' },
    }));

    expect(capAgentConversationToolMetadata({ events })).toEqual({
      toolMetadata: { truncated: true },
      toolMetadataTruncated: true,
    });
  });
});

describe('clampAgentConversationListLimit', () => {
  it('defaults to 20 and caps at 100', () => {
    expect(clampAgentConversationListLimit(undefined)).toBe(20);
    expect(clampAgentConversationListLimit(500)).toBe(100);
    expect(clampAgentConversationListLimit(0)).toBe(1);
  });
});

describe('clampAgentConversationMessagesLimit', () => {
  it('defaults to 100 and caps at 500', () => {
    expect(clampAgentConversationMessagesLimit(undefined)).toBe(100);
    expect(clampAgentConversationMessagesLimit(1000)).toBe(500);
    expect(clampAgentConversationMessagesLimit(0)).toBe(1);
  });
});
