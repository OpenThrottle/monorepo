import { describe, expect, test } from 'vitest';
import {
  agentsChatTurnFromSemanticSearchMcp,
  parseBearerJwt,
} from './agents-mcp-chat.mapper';

describe('parseBearerJwt', () => {
  test('returns undefined for undefined input', () => {
    expect(parseBearerJwt(undefined)).toBeUndefined();
  });

  test('returns undefined for empty string', () => {
    expect(parseBearerJwt('')).toBeUndefined();
  });

  test('returns undefined for whitespace-only string', () => {
    expect(parseBearerJwt('   ')).toBeUndefined();
  });

  test('uses first header when value is an array', () => {
    expect(parseBearerJwt(['Bearer first.jwt.token', 'Bearer ignored'])).toBe(
      'first.jwt.token',
    );
  });

  test('extracts JWT case-insensitively after Bearer prefix', () => {
    expect(parseBearerJwt('bEaReR abc.def.ghi')).toBe('abc.def.ghi');
  });

  test('returns undefined when Authorization is not Bearer', () => {
    expect(parseBearerJwt('Basic x')).toBeUndefined();
  });
});

describe('agentsChatTurnFromSemanticSearchMcp', () => {
  test('maps success result with text and structured content', () => {
    const result = agentsChatTurnFromSemanticSearchMcp(
      {
        content: [{ text: 'Hello from OT' }],
        structuredContent: { hits: 2 },
      },
      {
        arguments: {
          conversationId: 'conv-1',
          query: 'plans',
        },
      },
    );

    expect(result.errorMessage).toBeNull();
    expect(result.assistantText).toBe('Hello from OT');
    expect(JSON.parse(result.toolMetadataJson ?? '{}')).toEqual({
      arguments: { conversationId: 'conv-1', query: 'plans' },
      structuredContent: { hits: 2 },
      tool: 'semantic_search',
    });
  });

  test('maps MCP error result with fallback message when content empty', () => {
    const result = agentsChatTurnFromSemanticSearchMcp(
      {
        content: [],
        isError: true,
      },
      { arguments: { query: 'q' } },
    );

    expect(result.assistantText).toBeNull();
    expect(result.errorMessage).toBe('semantic_search failed.');
    expect(JSON.parse(result.toolMetadataJson ?? '{}').isError).toBe(true);
  });

  test('maps MCP error using first content text when present', () => {
    const result = agentsChatTurnFromSemanticSearchMcp(
      {
        content: [{ text: 'Tool validation failed' }],
        isError: true,
      },
      { arguments: { query: 'q' } },
    );

    expect(result.errorMessage).toBe('Tool validation failed');
  });

  test('uses empty assistant text when success payload has no content entries', () => {
    const result = agentsChatTurnFromSemanticSearchMcp(
      { content: [] },
      { arguments: { query: 'q' } },
    );

    expect(result.errorMessage).toBeNull();
    expect(result.assistantText).toBe('');
  });
});
