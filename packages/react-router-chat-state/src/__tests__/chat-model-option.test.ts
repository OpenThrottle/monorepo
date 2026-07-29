import { describe, expect, it } from 'vitest';

import {
  ChatPermissionMode,
  ChatReasoningLevel,
} from '@openthrottle/react-router-chat';
import { capabilitiesForChatOption } from '../chat-capabilities';
import * as React from 'react';
import {
  CLI_MODEL_GROUP_ID,
  buildModelGroups,
  cliGroupId,
  decodeChatOption,
  decodeModelOptionId,
  encodeCliEndpointOptionId,
  encodeCliOptionId,
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

  it('decodes a bare CLI token as a CLI backend at its default model', () => {
    expect(decodeChatOption('cursor')).toEqual({ backend: 'cursor' });
  });

  it('decodes a CLI backend|model id as a backend with a model override', () => {
    expect(decodeChatOption(encodeCliOptionId('cursor', 'gpt-5.2'))).toEqual({
      backend: 'cursor',
      model: 'gpt-5.2',
    });
    // A `provider/model` shaped CLI model round-trips (no `::`, contains `/`).
    expect(
      decodeChatOption(encodeCliOptionId('opencode', 'opencode/big-pickle')),
    ).toEqual({ backend: 'opencode', model: 'opencode/big-pickle' });
  });

  it('encodes a bare backend when no model is given', () => {
    expect(encodeCliOptionId('grok')).toBe('grok');
  });

  it('decodes a driver × local-endpoint id (backend|baseUrl::model)', () => {
    const id = encodeCliEndpointOptionId(
      'opencode',
      'http://localhost:11434/v1',
      'llama3',
    );
    expect(id).toBe('opencode|http://localhost:11434/v1::llama3');
    expect(decodeChatOption(id)).toEqual({
      backend: 'opencode',
      baseUrl: 'http://localhost:11434/v1',
      model: 'llama3',
    });
  });

  it('keeps an openai baseUrl::model id (no `|`) routed to the openai backend', () => {
    expect(decodeChatOption('http://localhost:11434/v1::llama3')).toEqual({
      backend: 'openai',
      baseUrl: 'http://localhost:11434/v1',
      model: 'llama3',
    });
  });

  it('returns null for a malformed driver×endpoint id', () => {
    expect(decodeChatOption('opencode|http://x/v1::')).toBeNull();
    expect(decodeChatOption('opencode|')).toBeNull();
  });

  it('returns null for an empty id', () => {
    expect(decodeChatOption('')).toBeNull();
  });
});

describe('buildModelGroups', () => {
  it('gives each agent CLI its own group and one group per OpenAI provider', () => {
    const groups = buildModelGroups([
      { groupId: 'openai:ollama', id: 'a', label: 'llama3' },
      { groupId: 'openai:ollama', id: 'b', label: 'qwen' },
      {
        groupId: cliGroupId('cursor'),
        id: 'cursor|auto',
        label: 'auto',
        subLabel: 'cursor-agent',
      },
      {
        groupId: cliGroupId('claude'),
        id: 'claude',
        label: 'claude-code',
        subLabel: 'claude-code',
      },
      { groupId: 'openai:localhost', id: 'c', label: 'mlx' },
    ]);

    // Labels + ids, in first-appearance order. OpenAI groups take the host/
    // provider; each CLI group takes the driver label from its option subLabel.
    expect(groups.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'openai:ollama', label: 'ollama' },
      { id: 'cursor', label: 'cursor-agent' },
      { id: 'claude', label: 'claude-code' },
      { id: 'openai:localhost', label: 'localhost' },
    ]);
    // Every group carries a resolved provider glyph.
    for (const group of groups) {
      expect(React.isValidElement(group.icon)).toBe(true);
    }
  });

  it('falls back to the bare group id when a CLI option has no sub-label', () => {
    const [group] = buildModelGroups([
      { groupId: cliGroupId('mystery'), id: 'mystery', label: 'Mystery' },
    ]);

    expect(group).toMatchObject({ id: 'mystery', label: 'mystery' });
  });

  it('still resolves the legacy collapsed group id to one "Agent CLIs" group', () => {
    const [group] = buildModelGroups([
      { groupId: CLI_MODEL_GROUP_ID, id: 'cursor', label: 'Cursor' },
    ]);

    expect(group).toMatchObject({
      id: CLI_MODEL_GROUP_ID,
      label: 'Agent CLIs',
    });
  });

  it('ignores options without a group id', () => {
    expect(buildModelGroups([{ id: 'x', label: 'X' }])).toEqual([]);
  });
});

describe('capabilitiesForChatOption', () => {
  it('gives OpenAI endpoints a completion descriptor: reasoning best-effort, no repo/tier/permission', () => {
    const caps = capabilitiesForChatOption(
      decodeChatOption('http://localhost:11434/v1::llama3'),
    );

    expect(caps.requiresRepository).toBe(false);
    // reasoning_effort is forwarded best-effort to local reasoning models.
    expect(caps.reasoningLevels).toEqual([
      ChatReasoningLevel.low,
      ChatReasoningLevel.medium,
      ChatReasoningLevel.high,
    ]);
    expect(caps.permissionModes).toEqual([]);
    expect(caps.serviceTiers).toEqual([]);
  });

  it('gives cursor a permission surface but NO separate reasoning/tier controls (baked into the model id)', () => {
    const caps = capabilitiesForChatOption(decodeChatOption('cursor'));

    expect(caps.requiresRepository).toBe(true);
    expect(caps.permissionModes).toContain(ChatPermissionMode.fullAccess);
    // cursor's reasoning + tier live in the model id (e.g. `...-high-fast`), so
    // they are not offered as separate composer controls.
    expect(caps.reasoningLevels).toEqual([]);
    expect(caps.serviceTiers).toEqual([]);
  });

  it('advertises NO service tier for any backend (no backend routes tier as a separate control)', () => {
    for (const backend of ['claude', 'codex', 'cursor', 'grok', 'opencode']) {
      const caps = capabilitiesForChatOption(decodeChatOption(backend));
      expect(caps.serviceTiers).toEqual([]);
      expect(caps.requiresRepository).toBe(true);
    }
  });

  it('lets claude reach xhigh/max and opencode reach max reasoning; codex/grok cap at high', () => {
    const claude = capabilitiesForChatOption(decodeChatOption('claude'));
    expect(claude.reasoningLevels).toContain(ChatReasoningLevel.extraHigh);
    expect(claude.reasoningLevels).toContain(ChatReasoningLevel.max);

    const opencode = capabilitiesForChatOption(decodeChatOption('opencode'));
    expect(opencode.reasoningLevels).toContain(ChatReasoningLevel.max);

    const codex = capabilitiesForChatOption(decodeChatOption('codex'));
    expect(codex.reasoningLevels).not.toContain(ChatReasoningLevel.extraHigh);
    expect(codex.reasoningLevels).not.toContain(ChatReasoningLevel.max);
  });

  it('treats every discovered CLI backend (claude, opencode) as a repo-scoped agent', () => {
    for (const backend of ['claude', 'opencode']) {
      const decoded = decodeChatOption(backend);
      expect(decoded).toEqual({ backend });
      expect(capabilitiesForChatOption(decoded).requiresRepository).toBe(true);
    }
  });

  it('keeps the backend descriptor for a CLI backend with a model override', () => {
    const caps = capabilitiesForChatOption(
      decodeChatOption(encodeCliOptionId('claude', 'opus')),
    );
    expect(caps.requiresRepository).toBe(true);
    expect(caps.reasoningLevels).toContain(ChatReasoningLevel.high);
  });

  it('keeps the full agent surface for a driver × local-endpoint option', () => {
    const caps = capabilitiesForChatOption(
      decodeChatOption(
        encodeCliEndpointOptionId(
          'opencode',
          'http://localhost:11434/v1',
          'llama3',
        ),
      ),
    );
    // A driver targeting a local endpoint is still a repo-scoped CLI agent.
    expect(caps.requiresRepository).toBe(true);
    expect(caps.permissionModes).toContain(ChatPermissionMode.fullAccess);
  });
});
