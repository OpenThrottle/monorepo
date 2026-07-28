import { describe, expect, it } from 'vitest';

import { CLI_MODEL_GROUP_ID } from '@openthrottle/react-router-chat-state';
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
  it('groups every agent CLI under the shared CLI group', () => {
    const options = toAgentChatOptions({
      agents: [
        { backend: 'cursor', label: 'Cursor', version: '1.2.3' },
        { backend: 'claude', label: 'Claude Code', version: null },
        { backend: 'opencode', label: 'OpenCode', version: '1.18.5' },
      ],
      totalCount: 3,
    });

    expect(options).toEqual([
      {
        description: 'Agent CLI · 1.2.3',
        groupId: CLI_MODEL_GROUP_ID,
        id: 'cursor',
        label: 'Cursor',
        subLabel: 'Agent CLI · 1.2.3',
      },
      {
        description: 'Agent CLI',
        groupId: CLI_MODEL_GROUP_ID,
        id: 'claude',
        label: 'Claude Code',
        subLabel: 'Agent CLI',
      },
      {
        description: 'Agent CLI · 1.18.5',
        groupId: CLI_MODEL_GROUP_ID,
        id: 'opencode',
        label: 'OpenCode',
        subLabel: 'Agent CLI · 1.18.5',
      },
    ]);
  });
});
