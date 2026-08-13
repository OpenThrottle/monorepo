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
          enabled: true,
          label: 'cursor-agent',
          models: ['auto', 'gpt-5.2'],
          supportsCustomBaseUrl: false,
        },
      ],
    });

    expect(options).toEqual([
      {
        description: 'cursor-agent',
        favorite: false,
        groupId: 'cursor',
        id: 'cursor|auto',
        label: 'auto',
        subLabel: 'cursor-agent',
      },
      {
        description: 'cursor-agent',
        favorite: false,
        groupId: 'cursor',
        id: 'cursor|gpt-5.2',
        label: 'gpt-5.2',
        subLabel: 'cursor-agent',
      },
    ]);
  });

  it('prefers modelOptions: drops disabled models, flags favorites, and orders favorites first', () => {
    const options = toAgentChatOptions({
      agents: [
        {
          backend: 'cursor',
          chatCapable: true,
          enabled: true,
          label: 'cursor-agent',
          modelOptions: [
            { enabled: true, favorite: false, model: 'auto' },
            { enabled: false, favorite: false, model: 'disabled-one' },
            { enabled: true, favorite: true, model: 'gpt-5.2' },
          ],
          models: ['auto', 'disabled-one', 'gpt-5.2'],
          supportsCustomBaseUrl: false,
        },
      ],
    });

    // disabled-one is dropped; the favorite (gpt-5.2) leads.
    expect(options).toEqual([
      {
        description: 'cursor-agent',
        favorite: true,
        groupId: 'cursor',
        id: 'cursor|gpt-5.2',
        label: 'gpt-5.2',
        subLabel: 'cursor-agent',
      },
      {
        description: 'cursor-agent',
        favorite: false,
        groupId: 'cursor',
        id: 'cursor|auto',
        label: 'auto',
        subLabel: 'cursor-agent',
      },
    ]);
  });

  it('offers nothing for a driver whose every model is disabled', () => {
    const options = toAgentChatOptions({
      agents: [
        {
          backend: 'cursor',
          chatCapable: true,
          enabled: true,
          label: 'cursor-agent',
          modelOptions: [{ enabled: false, favorite: false, model: 'auto' }],
          models: ['auto'],
          supportsCustomBaseUrl: false,
        },
      ],
    });

    expect(options).toEqual([]);
  });

  it('falls back to a bare-backend option when a driver lists no models', () => {
    const options = toAgentChatOptions({
      agents: [
        {
          backend: 'claude',
          chatCapable: true,
          enabled: true,
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
          enabled: true,
          label: 'future-plan-run-driver',
          models: [],
          supportsCustomBaseUrl: false,
        },
        {
          backend: 'another-plan-run-driver',
          chatCapable: false,
          enabled: true,
          label: 'another-plan-run-driver',
          models: ['some-model'],
          supportsCustomBaseUrl: false,
        },
      ],
    });

    expect(options).toEqual([]);
  });

  it('omits agents the user has disabled (and their models transitively)', () => {
    const options = toAgentChatOptions({
      agents: [
        {
          backend: 'cursor',
          chatCapable: true,
          enabled: false,
          label: 'cursor-agent',
          models: ['auto', 'gpt-5.2'],
          supportsCustomBaseUrl: false,
        },
        {
          backend: 'opencode',
          chatCapable: true,
          enabled: true,
          label: 'opencode',
          models: ['big-pickle'],
          supportsCustomBaseUrl: true,
        },
      ],
    });

    expect(options.map((option) => option.groupId)).toEqual(['opencode']);
  });
});

describe('toDriverEndpointChatOptions', () => {
  const agents = {
    agents: [
      {
        backend: 'opencode',
        chatCapable: true,
        enabled: true,
        label: 'opencode',
        models: ['opencode/big-pickle'],
        supportsCustomBaseUrl: true,
      },
      {
        backend: 'claude',
        chatCapable: true,
        enabled: true,
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
            enabled: true,
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

  it('omits a disabled driver from the endpoint join', () => {
    const options = toDriverEndpointChatOptions(
      {
        agents: [
          {
            backend: 'opencode',
            chatCapable: true,
            enabled: false,
            label: 'opencode',
            models: ['big-pickle'],
            supportsCustomBaseUrl: true,
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
