import { describe, expect, test } from 'vitest';
import {
  agentsChatTurnFromMcpToolResult,
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

describe('agentsChatTurnFromMcpToolResult', () => {
  test('maps success with routing metadata', () => {
    const result = agentsChatTurnFromMcpToolResult(
      {
        content: [{ text: 'Plans listed' }],
        structuredContent: { plans: [] },
      },
      {
        arguments: { conversationId: 'x', statuses: ['PENDING'] },
        confidence: 0.88,
        conversationId: 'x',
        readOnlyAgentsChat: true,
        routeReason: 'list_plans_by_status_heuristic',
        tool: 'list_plans_by_status',
      },
    );

    expect(result.errorMessage).toBeNull();
    expect(result.conversationId).toBe('x');
    expect(result.readOnlyAgentsChat).toBe(true);
    expect(result.routingConfidence).toBe(0.88);
    expect(result.routingReason).toBe('list_plans_by_status_heuristic');
    expect(result.assistantText).toBe('Plans listed');
    expect(result.mcpTool).toBe('list_plans_by_status');
    expect(result.structuredPayloadJson).toBe(JSON.stringify({ plans: [] }));
    expect(JSON.parse(result.toolMetadataJson ?? '{}')).toEqual({
      arguments: { conversationId: 'x', statuses: ['PENDING'] },
      confidence: 0.88,
      routeReason: 'list_plans_by_status_heuristic',
      structuredContent: { plans: [] },
      tool: 'list_plans_by_status',
    });
  });

  test('maps MCP error with tool-specific fallback message', () => {
    const result = agentsChatTurnFromMcpToolResult(
      { content: [], isError: true },
      {
        arguments: {},
        readOnlyAgentsChat: true,
        tool: 'health',
      },
    );

    expect(result.errorMessage).toBe('health failed.');
    expect(result.mcpTool).toBe('health');
    expect(result.readOnlyAgentsChat).toBe(true);
    expect(result.routingConfidence).toBeNull();
    expect(result.routingReason).toBeNull();
    expect(result.conversationId).toBeNull();
  });
});

describe('agentsChatTurnFromMcpToolResult (semantic_search)', () => {
  test('maps success result with text and structured content', () => {
    const result = agentsChatTurnFromMcpToolResult(
      {
        content: [{ text: 'Hello from OT' }],
        structuredContent: { hits: 2 },
      },
      {
        arguments: {
          conversationId: 'conv-1',
          query: 'plans',
        },
        conversationId: 'conv-1',
        readOnlyAgentsChat: true,
        tool: 'semantic_search',
      },
    );

    expect(result.errorMessage).toBeNull();
    expect(result.conversationId).toBe('conv-1');
    expect(result.readOnlyAgentsChat).toBe(true);
    expect(result.routingConfidence).toBeNull();
    expect(result.routingReason).toBeNull();
    expect(result.assistantText).toBe('Hello from OT');
    expect(result.mcpTool).toBe('semantic_search');
    expect(result.structuredPayloadJson).toBe(JSON.stringify({ hits: 2 }));
    expect(JSON.parse(result.toolMetadataJson ?? '{}')).toEqual({
      arguments: { conversationId: 'conv-1', query: 'plans' },
      structuredContent: { hits: 2 },
      tool: 'semantic_search',
    });
  });

  test('maps MCP error result with fallback message when content empty', () => {
    const result = agentsChatTurnFromMcpToolResult(
      {
        content: [],
        isError: true,
      },
      {
        arguments: { query: 'q' },
        readOnlyAgentsChat: false,
        tool: 'semantic_search',
      },
    );

    expect(result.assistantText).toBeNull();
    expect(result.errorMessage).toBe('semantic_search failed.');
    expect(result.mcpTool).toBe('semantic_search');
    expect(result.structuredPayloadJson).toBeNull();
    expect(JSON.parse(result.toolMetadataJson ?? '{}').isError).toBe(true);
  });

  test('maps MCP error using first content text when present', () => {
    const result = agentsChatTurnFromMcpToolResult(
      {
        content: [{ text: 'Tool validation failed' }],
        isError: true,
      },
      {
        arguments: { query: 'q' },
        readOnlyAgentsChat: true,
        tool: 'semantic_search',
      },
    );

    expect(result.errorMessage).toBe('Tool validation failed');
    expect(result.mcpTool).toBe('semantic_search');
    expect(result.structuredPayloadJson).toBeNull();
  });

  test('uses empty assistant text when success payload has no content entries', () => {
    const result = agentsChatTurnFromMcpToolResult(
      { content: [] },
      {
        arguments: { query: 'q' },
        readOnlyAgentsChat: true,
        tool: 'semantic_search',
      },
    );

    expect(result.errorMessage).toBeNull();
    expect(result.assistantText).toBe('');
    expect(result.mcpTool).toBe('semantic_search');
    expect(result.structuredPayloadJson).toBeNull();
  });
});
