import { describe, expect, it } from 'vitest';

import {
  CONVERSATION_PERMISSION_MODES,
  CONVERSATION_REASONING_EFFORTS,
  CONVERSATION_SERVICE_TIERS,
  CONVERSATION_STREAM_CHUNK_KINDS,
  toConversationPermissionMode,
  toConversationReasoningEffort,
  toConversationServiceTier,
} from '../types.ts';
import type {
  ConversationBackend,
  ConversationBackendRun,
  ConversationPermissionMode,
  ConversationReasoningEffort,
  ConversationServiceTier,
  ConversationStreamChunk,
  ConversationStreamChunkKind,
} from '../types.ts';

describe('CONVERSATION_PERMISSION_MODES', () => {
  it('exposes the three permission postures', () => {
    expect(CONVERSATION_PERMISSION_MODES).toEqual({
      autoAcceptEdits: 'autoAcceptEdits',
      fullAccess: 'fullAccess',
      supervised: 'supervised',
    });
  });

  it('every value is its own key (identity mapping)', () => {
    for (const [key, value] of Object.entries(CONVERSATION_PERMISSION_MODES)) {
      expect(value).toBe(key);
    }
  });
});

describe('toConversationPermissionMode', () => {
  it('accepts each known mode', () => {
    for (const mode of Object.values(CONVERSATION_PERMISSION_MODES)) {
      expect(toConversationPermissionMode(mode)).toBe(mode);
    }
  });

  it('returns undefined for null, undefined, and unknown strings', () => {
    expect(toConversationPermissionMode(null)).toBeUndefined();
    expect(toConversationPermissionMode(undefined)).toBeUndefined();
    expect(toConversationPermissionMode('bogus')).toBeUndefined();
    expect(toConversationPermissionMode('')).toBeUndefined();
  });
});

describe('CONVERSATION_REASONING_EFFORTS', () => {
  it('exposes the six reasoning levels', () => {
    expect(CONVERSATION_REASONING_EFFORTS).toEqual({
      extraHigh: 'extraHigh',
      high: 'high',
      low: 'low',
      max: 'max',
      medium: 'medium',
      ultra: 'ultra',
    });
  });
});

describe('toConversationReasoningEffort', () => {
  it('accepts each known level', () => {
    for (const effort of Object.values(CONVERSATION_REASONING_EFFORTS)) {
      expect(toConversationReasoningEffort(effort)).toBe(effort);
    }
  });

  it('returns undefined for null, undefined, and unknown strings', () => {
    expect(toConversationReasoningEffort(null)).toBeUndefined();
    expect(toConversationReasoningEffort(undefined)).toBeUndefined();
    expect(toConversationReasoningEffort('extreme')).toBeUndefined();
  });
});

describe('CONVERSATION_SERVICE_TIERS', () => {
  it('exposes fast and standard', () => {
    expect(CONVERSATION_SERVICE_TIERS).toEqual({
      fast: 'fast',
      standard: 'standard',
    });
  });
});

describe('toConversationServiceTier', () => {
  it('accepts each known tier', () => {
    for (const tier of Object.values(CONVERSATION_SERVICE_TIERS)) {
      expect(toConversationServiceTier(tier)).toBe(tier);
    }
  });

  it('returns undefined for null, undefined, and unknown strings', () => {
    expect(toConversationServiceTier(null)).toBeUndefined();
    expect(toConversationServiceTier(undefined)).toBeUndefined();
    expect(toConversationServiceTier('priority')).toBeUndefined();
  });
});

describe('CONVERSATION_STREAM_CHUNK_KINDS', () => {
  it('maps each kind to its snake_case wire value', () => {
    expect(CONVERSATION_STREAM_CHUNK_KINDS).toEqual({
      keepalive: 'keepalive',
      session: 'session',
      text: 'text',
      thinking: 'thinking',
      toolCall: 'tool_call',
      toolResult: 'tool_result',
      usage: 'usage',
    });
  });

  it('has exactly seven distinct kinds', () => {
    const values = Object.values(CONVERSATION_STREAM_CHUNK_KINDS);
    expect(values).toHaveLength(7);
    expect(new Set(values).size).toBe(7);
  });
});

describe('type shapes (compile-time assignability + runtime construction)', () => {
  it('accepts a valid permission mode, reasoning effort, and service tier as literals', () => {
    const permissionMode: ConversationPermissionMode = 'supervised';
    const reasoning: ConversationReasoningEffort = 'high';
    const serviceTier: ConversationServiceTier = 'fast';

    expect(permissionMode).toBe(CONVERSATION_PERMISSION_MODES.supervised);
    expect(reasoning).toBe(CONVERSATION_REASONING_EFFORTS.high);
    expect(serviceTier).toBe(CONVERSATION_SERVICE_TIERS.fast);
  });

  it('constructs a terminal text ConversationStreamChunk', () => {
    const kind: ConversationStreamChunkKind = 'text';
    const chunk: ConversationStreamChunk = {
      delta: '',
      done: true,
      kind,
    };

    expect(chunk).toEqual({ delta: '', done: true, kind: 'text' });
  });

  it('constructs an errored, non-text chunk carrying metadata', () => {
    const chunk: ConversationStreamChunk = {
      delta: '',
      done: true,
      error: 'the endpoint stalled',
      kind: 'tool_call',
      metadata: { args: { path: 'src/index.ts' }, name: 'read_file' },
    };

    expect(chunk.kind).toBe(CONVERSATION_STREAM_CHUNK_KINDS.toolCall);
    expect(chunk.metadata).toEqual({
      args: { path: 'src/index.ts' },
      name: 'read_file',
    });
    expect(chunk.error).toBe('the endpoint stalled');
  });

  it('constructs a minimal ConversationBackendRun with only the required fields', () => {
    const run: ConversationBackendRun = {
      messages: [{ content: 'hi', role: 'user' }],
      model: 'llama3',
    };

    expect(run.messages).toHaveLength(1);
    expect(run.baseUrl).toBeUndefined();
  });

  it('constructs a fully-populated ConversationBackendRun', () => {
    const run: ConversationBackendRun = {
      baseUrl: 'http://localhost:11434/v1',
      cwd: '/repo',
      fileMentions: ['src/index.ts'],
      mcpEnv: { OT_MCP_TOKEN: 'secret' },
      mcpServers: { ot: { args: [], command: 'node' } },
      messages: [
        { content: 'be terse', role: 'system' },
        { content: 'ping', role: 'user' },
      ],
      model: 'claude',
      permissionMode: CONVERSATION_PERMISSION_MODES.fullAccess,
      reasoning: CONVERSATION_REASONING_EFFORTS.max,
      resumeSession: true,
      serviceTier: CONVERSATION_SERVICE_TIERS.fast,
      sessionId: 'sess-1',
      systemPrompt: 'You are terse.',
    };

    expect(run.resumeSession).toBe(true);
    expect(run.permissionMode).toBe('fullAccess');
    expect(run.fileMentions).toEqual(['src/index.ts']);
  });

  it('implements ConversationBackend.stream as an AsyncIterable of chunks', async () => {
    const backend: ConversationBackend = {
      async *stream(
        run: ConversationBackendRun,
      ): AsyncIterable<ConversationStreamChunk> {
        yield { delta: run.model, done: false, kind: 'text' };
        yield { delta: '', done: true, kind: 'text' };
      },
    };

    const seen: ConversationStreamChunk[] = [];
    for await (const chunk of backend.stream({
      messages: [],
      model: 'llama3',
    })) {
      seen.push(chunk);
    }

    expect(seen).toEqual([
      { delta: 'llama3', done: false, kind: 'text' },
      { delta: '', done: true, kind: 'text' },
    ]);
  });
});
