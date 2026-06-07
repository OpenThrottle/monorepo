import { describe, expect, it } from 'vitest';
import { AGENT_CONVERSATION_TOOL_METADATA_MAX_BYTES } from './agent-conversation.constants';
import {
  capAgentConversationContent,
  capAgentConversationToolMetadata,
  clampAgentConversationListLimit,
  clampAgentConversationMessagesLimit,
  deriveConversationTitleFromMessage,
} from './agent-conversation.util';

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
