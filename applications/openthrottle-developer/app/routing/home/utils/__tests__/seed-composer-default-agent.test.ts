import type { ChatModelOption } from '@openthrottle/react-router-chat';
import { ChatReasoningLevel } from '@openthrottle/react-router-chat';
import { DEFAULT_CHAT_TOOLBAR_STATE } from '@openthrottle/react-router-chat-state';
import { describe, expect, it } from 'vitest';

import type { ComposerDefaultAgent } from '~/routing/home/utils/seed-composer-default-agent';
import { seedComposerDefaultAgent } from '~/routing/home/utils/seed-composer-default-agent';

const models: ChatModelOption[] = [
  { id: 'cursor', label: 'Cursor' },
  { id: 'claude', label: 'Claude Code' },
  { id: 'claude|opus', label: 'Opus' },
];

const agent: ComposerDefaultAgent = {
  backend: 'claude',
  effort: 'high',
  model: 'opus',
};

describe('seedComposerDefaultAgent', () => {
  describe('when there is no preference', () => {
    it('returns the persisted state unchanged', () => {
      const result = seedComposerDefaultAgent(
        DEFAULT_CHAT_TOOLBAR_STATE,
        null,
        models,
      );

      expect(result).toBe(DEFAULT_CHAT_TOOLBAR_STATE);
    });
  });

  describe('when the atom remembers nothing', () => {
    it('seeds the named model option and the effort', () => {
      const result = seedComposerDefaultAgent(
        DEFAULT_CHAT_TOOLBAR_STATE,
        agent,
        models,
      );

      expect(result.modelId).toBe('claude|opus');
      expect(result.reasoning).toBe('high');
    });

    it('seeds the bare-backend option for the default model', () => {
      const result = seedComposerDefaultAgent(
        DEFAULT_CHAT_TOOLBAR_STATE,
        { ...agent, model: 'auto' },
        models,
      );

      expect(result.modelId).toBe('claude');
    });

    it('leaves reasoning unset when the preference has no effort', () => {
      const result = seedComposerDefaultAgent(
        DEFAULT_CHAT_TOOLBAR_STATE,
        { ...agent, effort: null },
        models,
      );

      expect(result.reasoning).toBeUndefined();
    });

    it('ignores an effort outside the reasoning vocabulary', () => {
      const result = seedComposerDefaultAgent(
        DEFAULT_CHAT_TOOLBAR_STATE,
        { ...agent, effort: 'turbo' },
        models,
      );

      expect(result.reasoning).toBeUndefined();
    });
  });

  describe('when the preference is no longer offered', () => {
    it('leaves modelId and reasoning for the discovery seed', () => {
      const result = seedComposerDefaultAgent(
        DEFAULT_CHAT_TOOLBAR_STATE,
        { ...agent, model: 'retired-model' },
        models,
      );

      expect(result.modelId).toBeUndefined();
      expect(result.reasoning).toBeUndefined();
    });
  });

  describe('when the atom remembers a pick', () => {
    it('keeps the remembered model and reasoning', () => {
      const persisted = {
        ...DEFAULT_CHAT_TOOLBAR_STATE,
        modelId: 'claude',
        reasoning: ChatReasoningLevel.low,
      };

      const result = seedComposerDefaultAgent(persisted, agent, models);

      expect(result.modelId).toBe('claude');
      expect(result.reasoning).toBe('low');
    });

    it('seeds the effort when the remembered model is on the default backend', () => {
      const persisted = { ...DEFAULT_CHAT_TOOLBAR_STATE, modelId: 'claude' };

      const result = seedComposerDefaultAgent(persisted, agent, models);

      expect(result.reasoning).toBe('high');
    });

    it('does not leak the effort onto a different backend', () => {
      const persisted = { ...DEFAULT_CHAT_TOOLBAR_STATE, modelId: 'cursor' };

      const result = seedComposerDefaultAgent(persisted, agent, models);

      expect(result.modelId).toBe('cursor');
      expect(result.reasoning).toBeUndefined();
    });
  });
});
