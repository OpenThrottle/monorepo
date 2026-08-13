import { describe, expect, it } from 'vitest';

import {
  toAgentChatOptions,
  toChatModelOptions,
  toDriverEndpointChatOptions,
} from '../chat-discovery-options';

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
    expect(toChatModelOptions({ endpoints: [] })).toEqual([]);
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
          supportsCustomBaseUrl: false,
        },
      ],
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
          supportsCustomBaseUrl: false,
        },
      ],
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
          supportsCustomBaseUrl: false,
        },
        {
          backend: 'another-plan-run-driver',
          chatCapable: false,
          label: 'another-plan-run-driver',
          models: ['some-model'],
          supportsCustomBaseUrl: false,
        },
      ],
    });

    expect(options).toEqual([]);
  });
});

describe('toDriverEndpointChatOptions', () => {
  const agents = {
    agents: [
      {
        backend: 'opencode',
        chatCapable: true,
        label: 'opencode',
        models: ['opencode/big-pickle'],
        supportsCustomBaseUrl: true,
      },
      {
        backend: 'claude',
        chatCapable: true,
        label: 'claude-code',
        models: [],
        supportsCustomBaseUrl: false,
      },
    ],
  };

  it('joins base-URL-capable drivers with discovered endpoints × models', () => {
    const options = toDriverEndpointChatOptions(agents, {
      endpoints: [
        {
          baseUrl: 'http://localhost:11434/v1',
          host: 'localhost',
          models: ['llama3', 'qwen'],
          provider: 'ollama',
        },
      ],
    });

    expect(options).toEqual([
      {
        description: 'opencode · ollama (local)',
        groupId: 'opencode',
        id: 'opencode|http://localhost:11434/v1::llama3',
        label: 'llama3',
        subLabel: 'opencode',
      },
      {
        description: 'opencode · ollama (local)',
        groupId: 'opencode',
        id: 'opencode|http://localhost:11434/v1::qwen',
        label: 'qwen',
        subLabel: 'opencode',
      },
    ]);
  });

  it('flags a host.docker.internal endpoint as possibly unreachable', () => {
    const [option] = toDriverEndpointChatOptions(agents, {
      endpoints: [
        {
          baseUrl: 'http://host.docker.internal:11434/v1',
          host: 'host.docker.internal',
          models: ['llama3'],
          provider: 'ollama',
        },
      ],
    });

    expect(option?.description).toContain('may be unreachable outside Docker');
  });

  it('omits non-base-URL-capable drivers (claude/cursor) from the join', () => {
    const options = toDriverEndpointChatOptions(
      {
        agents: [
          {
            backend: 'claude',
            chatCapable: true,
            label: 'claude-code',
            models: [],
            supportsCustomBaseUrl: false,
          },
        ],
      },
      {
        endpoints: [
          {
            baseUrl: 'http://localhost:11434/v1',
            host: 'localhost',
            models: ['llama3'],
            provider: 'ollama',
          },
        ],
      },
    );

    expect(options).toEqual([]);
  });
});
