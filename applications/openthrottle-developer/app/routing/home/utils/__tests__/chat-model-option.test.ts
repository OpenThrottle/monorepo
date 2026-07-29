import { describe, expect, it } from 'vitest';

import { toAgentChatOptions, toChatModelOptions } from '../chat-model-option';

describe('toChatModelOptions', () => {
  it('flattens endpoints × models with provider fallback to host', () => {
    const options = toChatModelOptions({
      endpoints: [
        {
          baseUrl: 'http://localhost:11434/v1',
          host: 'localhost',
          models: ['llama3', 'qwen'],
          provider: 'ollama',
        },
        {
          baseUrl: 'http://localhost:1234/v1',
          host: 'localhost',
          models: ['mlx'],
          provider: null,
        },
      ],
      totalCount: 2,
    });

    expect(options).toEqual([
      {
        description: 'ollama',
        groupId: 'openai:ollama',
        id: 'http://localhost:11434/v1::llama3',
        label: 'llama3',
      },
      {
        description: 'ollama',
        groupId: 'openai:ollama',
        id: 'http://localhost:11434/v1::qwen',
        label: 'qwen',
      },
      {
        description: 'localhost',
        groupId: 'openai:localhost',
        id: 'http://localhost:1234/v1::mlx',
        label: 'mlx',
      },
    ]);
  });

  it('returns an empty list when nothing is discovered', () => {
    expect(toChatModelOptions({ endpoints: [], totalCount: 0 })).toEqual([]);
  });
});

describe('toAgentChatOptions', () => {
  it('emits one option per model for chat-capable drivers, keyed backend|model', () => {
    const options = toAgentChatOptions({
      agents: [
        {
          backend: 'cursor',
          chatCapable: true,
          label: 'cursor-agent',
          models: ['auto', 'gpt-5.2'],
          version: '1.2.3',
        },
      ],
      totalCount: 1,
    });

    expect(options).toEqual([
      {
        description: 'cursor-agent',
        groupId: 'cursor',
        id: 'cursor|auto',
        label: 'auto',
        subLabel: 'cursor-agent',
      },
      {
        description: 'cursor-agent',
        groupId: 'cursor',
        id: 'cursor|gpt-5.2',
        label: 'gpt-5.2',
        subLabel: 'cursor-agent',
      },
    ]);
  });

  it('falls back to a bare-backend option when a driver lists no models', () => {
    const options = toAgentChatOptions({
      agents: [
        {
          backend: 'claude',
          chatCapable: true,
          label: 'claude-code',
          models: [],
          version: '2.1.220',
        },
      ],
      totalCount: 1,
    });

    expect(options).toEqual([
      {
        description: 'claude-code',
        groupId: 'claude',
        id: 'claude',
        label: 'claude-code',
        subLabel: 'claude-code',
      },
    ]);
  });

  it('omits plan-run-only (non-chat-capable) drivers', () => {
    const options = toAgentChatOptions({
      agents: [
        {
          backend: 'future-plan-run-driver',
          chatCapable: false,
          label: 'future-plan-run-driver',
          models: [],
          version: '1.0.0',
        },
        {
          backend: 'another-plan-run-driver',
          chatCapable: false,
          label: 'another-plan-run-driver',
          models: ['some-model'],
          version: '2.0.0',
        },
      ],
      totalCount: 2,
    });

    expect(options).toEqual([]);
  });
});
