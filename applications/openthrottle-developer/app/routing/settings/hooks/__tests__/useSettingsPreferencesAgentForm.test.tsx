import { act, renderHook } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { MOCK_PLAN_RUN_MODELS } from '~/routing/plans/data/mock.plan-run-models';

import type { UseSettingsPreferencesAgentFormOptions } from '../useSettingsPreferencesAgentForm';
import { useSettingsPreferencesAgentForm } from '../useSettingsPreferencesAgentForm';

describe('useSettingsPreferencesAgentForm', () => {
  let options: UseSettingsPreferencesAgentFormOptions;

  const renderAgentForm = () => {
    // useFetcher needs a data router.
    const wrapper = (wrapperProps: React.PropsWithChildren) => {
      const RoutesStub = createRoutesStub([
        { Component: () => wrapperProps.children, path: '/' },
      ]);
      return <RoutesStub />;
    };

    return renderHook(() => useSettingsPreferencesAgentForm(options), {
      wrapper,
    });
  };

  beforeEach(() => {
    options = { defaultAgent: null, models: MOCK_PLAN_RUN_MODELS };
  });

  test('offers only options a plan run can execute', () => {
    const { result } = renderAgentForm();

    expect(result.current.runnableModels.map((option) => option.id)).toEqual([
      'cursor|auto',
      'cursor|gpt-5.2',
      'claude|opus',
    ]);
  });

  test('starts with no draft when nothing is stored', () => {
    const { result } = renderAgentForm();

    expect(result.current.draft).toBeNull();
    expect(result.current.selectedOptionId).toBeUndefined();
    expect(result.current.effortSupported).toBe(false);
  });

  test('seeds the draft from a valid stored default', () => {
    options = {
      ...options,
      defaultAgent: { backend: 'claude', effort: 'high', model: 'opus' },
    };
    const { result } = renderAgentForm();

    expect(result.current.draft).toEqual({
      backend: 'claude',
      effort: 'high',
      model: 'opus',
    });
    expect(result.current.selectedOptionId).toBe('claude|opus');
    expect(result.current.effortSupported).toBe(true);
  });

  test('drops the effort when switching to a backend without one', () => {
    options = {
      ...options,
      defaultAgent: { backend: 'claude', effort: 'high', model: 'opus' },
    };
    const { result } = renderAgentForm();

    act(() => {
      result.current.onModelChange('cursor|gpt-5.2');
    });

    expect(result.current.draft).toEqual({
      backend: 'cursor',
      effort: '',
      model: 'gpt-5.2',
    });
    expect(result.current.effortSupported).toBe(false);
  });

  test('ignores an option a plan cannot run', () => {
    const { result } = renderAgentForm();

    act(() => {
      result.current.onModelChange('http://localhost:1234/v1::llama3');
    });

    expect(result.current.draft).toBeNull();
  });
});
