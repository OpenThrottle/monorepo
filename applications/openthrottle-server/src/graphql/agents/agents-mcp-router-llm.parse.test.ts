import { describe, expect, test } from 'vitest';
import {
  buildAgentsMcpLlmRoutingSystemPrompt,
  messageContentToString,
  parseAgentsMcpLlmRoutingJson,
  stripMarkdownJsonFence,
} from './agents-mcp-router-llm.parse';

describe('stripMarkdownJsonFence', () => {
  test('returns inner JSON for fenced blocks', () => {
    expect(
      stripMarkdownJsonFence('```json\n{"tool":"health"}\n```').trim(),
    ).toBe('{"tool":"health"}');
  });

  test('returns trimmed text when not fenced', () => {
    expect(stripMarkdownJsonFence('  {"tool":"health"}  ')).toBe(
      '{"tool":"health"}',
    );
  });
});

describe('messageContentToString', () => {
  test('passes through strings', () => {
    expect(messageContentToString('abc')).toBe('abc');
  });

  test('joins text parts from content arrays', () => {
    expect(
      messageContentToString([
        { text: 'hello', type: 'text' },
        { text: ' world', type: 'text' },
      ]),
    ).toBe('hello world');
  });
});

describe('parseAgentsMcpLlmRoutingJson', () => {
  test('parses valid routing JSON', () => {
    const out = parseAgentsMcpLlmRoutingJson(
      JSON.stringify({
        args: {},
        confidence: 0.82,
        reason: 'user asked for KB sources',
        tool: 'list_sources',
      }),
    );

    expect(out).toEqual({
      args: {},
      confidence: 0.82,
      reason: 'user asked for KB sources',
      tool: 'list_sources',
    });
  });

  test('defaults missing args to empty object', () => {
    const out = parseAgentsMcpLlmRoutingJson(
      JSON.stringify({
        confidence: 0.9,
        reason: 'x',
        tool: 'health',
      }),
    );

    expect(out?.args).toEqual({});
  });

  test('returns null for invalid tool name', () => {
    expect(
      parseAgentsMcpLlmRoutingJson(
        JSON.stringify({
          args: {},
          confidence: 0.5,
          reason: 'x',
          tool: 'not_a_real_tool',
        }),
      ),
    ).toBeNull();
  });

  test('returns null for malformed JSON', () => {
    expect(parseAgentsMcpLlmRoutingJson('not json')).toBeNull();
  });
});

describe('buildAgentsMcpLlmRoutingSystemPrompt', () => {
  test('mentions all routed tools', () => {
    const p = buildAgentsMcpLlmRoutingSystemPrompt();

    expect(p).toContain('semantic_search');
    expect(p).toContain('list_sources');
    expect(p).toContain('get_plan');
  });
});
