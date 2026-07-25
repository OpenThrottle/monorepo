import { describe, expect, it } from 'vitest';

import {
  ChatPermissionMode,
  ChatReasoningLevel,
  ChatServiceTier,
} from '@openthrottle/react-router-chat';
import { capabilitiesForChatOption } from '../chat-capabilities';
import {
  CLI_MODEL_GROUP_ID,
  buildModelGroups,
  decodeChatOption,
  decodeModelOptionId,
  encodeModelOptionId,
  toAgentChatOptions,
  toChatModelOptions,
} from '../chat-model-option';

describe('encode/decode model option id', () => {
  it('round-trips baseUrl + model', () => {
    const id = encodeModelOptionId('http://localhost:11434/v1', 'llama3');
    expect(id).toBe('http://localhost:11434/v1::llama3');
    expect(decodeModelOptionId(id)).toEqual({
      baseUrl: 'http://localhost:11434/v1',
      model: 'llama3',
    });
  });

  it('returns null for a malformed id', () => {
    expect(decodeModelOptionId('no-separator')).toBeNull();
    expect(decodeModelOptionId('::llama3')).toBeNull();
    expect(decodeModelOptionId('http://x/v1::')).toBeNull();
  });
});

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
      ],
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
    ]);
  });
});

describe('buildModelGroups', () => {
  it('collapses CLIs into one group and one group per OpenAI provider', () => {
    const groups = buildModelGroups([
      { groupId: 'openai:ollama', id: 'a', label: 'llama3' },
      { groupId: 'openai:ollama', id: 'b', label: 'qwen' },
      { groupId: CLI_MODEL_GROUP_ID, id: 'cursor', label: 'Cursor' },
      { groupId: 'openai:localhost', id: 'c', label: 'mlx' },
    ]);

    expect(groups).toEqual([
      { id: 'openai:ollama', label: 'ollama' },
      { id: CLI_MODEL_GROUP_ID, label: 'Agent CLIs' },
      { id: 'openai:localhost', label: 'localhost' },
    ]);
  });

  it('ignores options without a group id', () => {
    expect(buildModelGroups([{ id: 'x', label: 'X' }])).toEqual([]);
  });
});

describe('capabilitiesForChatOption', () => {
  it('gives OpenAI endpoints the minimal descriptor (no repo, no controls)', () => {
    const caps = capabilitiesForChatOption(
      decodeChatOption('http://localhost:11434/v1::llama3'),
    );

    expect(caps.requiresRepository).toBe(false);
    expect(caps.reasoningLevels).toEqual([]);
    expect(caps.permissionModes).toEqual([]);
    expect(caps.serviceTiers).toEqual([]);
  });

  it('gives CLI backends the full agent control surface', () => {
    const caps = capabilitiesForChatOption(decodeChatOption('cursor'));

    expect(caps.requiresRepository).toBe(true);
    expect(caps.reasoningLevels).toContain(ChatReasoningLevel.high);
    expect(caps.permissionModes).toContain(ChatPermissionMode.fullAccess);
    expect(caps.serviceTiers).toContain(ChatServiceTier.fast);
  });
});
