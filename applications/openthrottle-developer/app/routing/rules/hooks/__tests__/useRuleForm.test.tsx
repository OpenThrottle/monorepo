import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import type { TagActionRuleRowFragment } from '~/__generated__/graphql';
import { ANY } from '~/routing/rules/data/data.rule-form-options';

import { useRuleForm } from '../useRuleForm';

const buildInitialRule = (
  overrides: Partial<TagActionRuleRowFragment> = {},
): TagActionRuleRowFragment => {
  return {
    actionPayloadJson: JSON.stringify({
      placement: 'first',
      skillSlug: 'grilling',
    }),
    actionType: 'inject-task',
    createdAt: '2026-01-01T00:00:00.000Z',
    enabled: true,
    environment: 'ci',
    id: 'rule-1',
    repositoryId: null,
    status: 'IN_PROGRESS',
    tagAll: ['breakdown'],
    title: 'Grill breakdowns',
    updatedAt: '2026-01-01T00:00:00.000Z',
    userId: 'user-1',
    ...overrides,
  };
};

describe('useRuleForm', () => {
  test('defaults to empty create-mode state', () => {
    const { result } = renderHook(() => useRuleForm({}));

    expect(result.current.isEdit).toBe(false);
    expect(result.current.title).toBe('');
    expect(result.current.actionType).toBe('inject-task');
    expect(result.current.repositoryId).toBe(ANY);
    expect(result.current.status).toBe(ANY);
    expect(result.current.environment).toBe(ANY);
    expect(result.current.tagAll).toEqual([]);
    expect(result.current.submitDisabled).toBe(true);
  });

  test('hydrates state from an initial rule and parses its payload', () => {
    const { result } = renderHook(() =>
      useRuleForm({ initialRule: buildInitialRule() }),
    );

    expect(result.current.isEdit).toBe(true);
    expect(result.current.title).toBe('Grill breakdowns');
    expect(result.current.tagAll).toEqual(['breakdown']);
    expect(result.current.status).toBe('IN_PROGRESS');
    expect(result.current.environment).toBe('ci');
    expect(result.current.skillSlug).toBe('grilling');
    expect(result.current.placement).toBe('first');
    expect(result.current.submitDisabled).toBe(false);
  });

  test('submit is disabled without a title, and without a skill for inject-task', () => {
    const { result } = renderHook(() => useRuleForm({}));

    act(() => result.current.setTitle('New rule'));
    expect(result.current.submitDisabled).toBe(true);

    act(() => result.current.setSkillSlug('grilling'));
    expect(result.current.submitDisabled).toBe(false);
  });

  test('assembles the inject-task payload from title/skill/placement fields', () => {
    const { result } = renderHook(() => useRuleForm({}));

    act(() => {
      result.current.setSkillSlug('grilling');
      result.current.setPlacement('last');
      result.current.setTitleTemplate('Run {{skill}}');
    });

    expect(JSON.parse(result.current.actionPayloadJson)).toEqual({
      placement: 'last',
      skillSlug: 'grilling',
      titleTemplate: 'Run {{skill}}',
    });
  });

  test('switches to the availability-exception payload shape', () => {
    const { result } = renderHook(() => useRuleForm({}));

    act(() => {
      result.current.setActionType('availability-exception');
      result.current.setTagAllow('a, b');
      result.current.setTagDeny('c');
      result.current.setSlugAllow('d');
      result.current.setSlugDeny('');
    });

    expect(JSON.parse(result.current.actionPayloadJson)).toEqual({
      slugAllow: ['d'],
      slugDeny: [],
      tagAllow: ['a', 'b'],
      tagDeny: ['c'],
    });
    // title-only requirement for non inject-task types
    expect(result.current.submitDisabled).toBe(true);
    act(() => result.current.setTitle('Exception rule'));
    expect(result.current.submitDisabled).toBe(false);
  });

  test('toggles tag chips on and off', () => {
    const { result } = renderHook(() => useRuleForm({}));

    act(() => result.current.handleToggleTag('domain:github'));
    expect(result.current.tagAll).toEqual(['domain:github']);

    act(() => result.current.handleToggleTag('domain:github'));
    expect(result.current.tagAll).toEqual([]);
  });

  describe('attach-prompt', () => {
    const attachRule = (payload: Record<string, string>) => {
      return buildInitialRule({
        actionPayloadJson: JSON.stringify(payload),
        actionType: 'attach-prompt',
      });
    };

    test('serializes the chosen prompt by id with its type and placement', () => {
      const { result } = renderHook(() => useRuleForm({}));

      act(() => {
        result.current.setActionType('attach-prompt');
        result.current.setTitle('Attach');
      });
      expect(result.current.submitDisabled).toBe(true);

      act(() => {
        result.current.attachPrompt.onPromptChange('prompt-1', 'personas');
        result.current.attachPrompt.onPlacementChange('start');
      });

      expect(JSON.parse(result.current.actionPayloadJson)).toEqual({
        placement: 'start',
        promptId: 'prompt-1',
        promptType: 'personas',
      });
      expect(result.current.submitDisabled).toBe(false);
    });

    test('defaults placement to end', () => {
      const { result } = renderHook(() => useRuleForm({}));

      expect(result.current.attachPrompt.placement).toBe('end');
    });

    test('round-trips an existing rule', () => {
      const { result } = renderHook(() =>
        useRuleForm({
          initialRule: attachRule({
            placement: 'start',
            promptId: 'prompt-9',
            promptType: 'personas',
          }),
        }),
      );

      expect(result.current.actionType).toBe('attach-prompt');
      expect(result.current.attachPrompt.promptId).toBe('prompt-9');
      expect(result.current.attachPrompt.placement).toBe('start');
      expect(JSON.parse(result.current.actionPayloadJson)).toEqual({
        placement: 'start',
        promptId: 'prompt-9',
        promptType: 'personas',
      });
    });

    test('keeps a filePath reference until a prompt is chosen', () => {
      const { result } = renderHook(() =>
        useRuleForm({
          initialRule: attachRule({
            filePath: 'a/b.md',
            placement: 'end',
            promptType: 'prompts',
          }),
        }),
      );

      expect(result.current.attachPrompt.filePath).toBe('a/b.md');
      expect(result.current.submitDisabled).toBe(false);
      expect(JSON.parse(result.current.actionPayloadJson)).toEqual({
        filePath: 'a/b.md',
        placement: 'end',
        promptType: 'prompts',
      });

      act(() => result.current.attachPrompt.onPromptChange('p-2', 'prompts'));

      expect(JSON.parse(result.current.actionPayloadJson)).toEqual({
        placement: 'end',
        promptId: 'p-2',
        promptType: 'prompts',
      });
    });

    test('an inject-task rule does not leak its placement into attach-prompt', () => {
      const { result } = renderHook(() =>
        useRuleForm({ initialRule: buildInitialRule() }),
      );

      expect(result.current.attachPrompt.placement).toBe('end');
    });
  });
});
