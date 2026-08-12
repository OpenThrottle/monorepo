import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ANY } from '~/routing/rules/data/rule-form-options';
import { useRuleForm } from './useRuleForm';
import type { TagActionRuleRowData } from '~/routing/rules/components/RulesTable';

const buildInitialRule = (
  overrides: Partial<TagActionRuleRowData> = {},
): TagActionRuleRowData => ({
  actionPayloadJson: JSON.stringify({
    placement: 'first',
    skillSlug: 'grilling',
  }),
  actionType: 'inject-task',
  createdAt: '2026-01-01T00:00:00.000Z',
  enabled: true,
  environment: 'ci',
  id: 'rule-1',
  projectId: null,
  status: 'IN_PROGRESS',
  tagAll: ['breakdown'],
  title: 'Grill breakdowns',
  updatedAt: '2026-01-01T00:00:00.000Z',
  userId: 'user-1',
  ...overrides,
});

describe('useRuleForm', () => {
  test('defaults to empty create-mode state', () => {
    const { result } = renderHook(() => useRuleForm({}));

    expect(result.current.isEdit).toBe(false);
    expect(result.current.title).toBe('');
    expect(result.current.actionType).toBe('inject-task');
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
});
