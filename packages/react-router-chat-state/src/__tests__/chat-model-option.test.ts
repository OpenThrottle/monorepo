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

describe('decodeChatOption', () => {
  it('decodes an openai endpoint::model id', () => {
    expect(decodeChatOption('http://localhost:11434/v1::llama3')).toEqual({
      backend: 'openai',
      baseUrl: 'http://localhost:11434/v1',
      model: 'llama3',
    });
  });

  it('decodes a bare CLI token as a CLI backend', () => {
    expect(decodeChatOption('cursor')).toEqual({ backend: 'cursor' });
  });

  it('returns null for an empty id', () => {
    expect(decodeChatOption('')).toBeNull();
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

  it('treats every discovered CLI backend (claude, opencode) as a repo-scoped agent', () => {
    for (const backend of ['claude', 'opencode']) {
      const decoded = decodeChatOption(backend);
      expect(decoded).toEqual({ backend });
      expect(capabilitiesForChatOption(decoded).requiresRepository).toBe(true);
    }
  });
});
