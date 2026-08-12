import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import {
  FAVORITES_GROUP_ID,
  useChatModelPicker,
  type UseChatModelPickerOptions,
} from '../use-chat-model-picker';
import type { ChatModelGroup, ChatModelOption } from '../../types';

const groups: readonly ChatModelGroup[] = [
  { id: 'claude', label: 'Claude' },
  { id: 'codex', label: 'Codex' },
];

const models: readonly ChatModelOption[] = [
  { groupId: 'claude', id: 'sonnet', label: 'Sonnet' },
  { favorite: true, groupId: 'claude', id: 'opus', label: 'Opus' },
  { groupId: 'codex', id: 'gpt', label: 'GPT' },
  { id: 'mystery', label: 'Mystery' },
];

const baseOptions = (
  overrides: Partial<UseChatModelPickerOptions> = {},
): UseChatModelPickerOptions => ({
  groups,
  models,
  onModelChange: vi.fn(),
  placeholder: 'Select a model',
  ...overrides,
});

describe('useChatModelPicker', () => {
  test('starts closed with an empty search', () => {
    const { result } = renderHook(() => useChatModelPicker(baseOptions()));
    expect(result.current.open).toBe(false);
    expect(result.current.search).toBe('');
  });

  test('builds Favorites, provider groups, and an Other catch-all in order', () => {
    const { result } = renderHook(() => useChatModelPicker(baseOptions()));
    const ids = result.current.resolvedGroups.map((group) => group.id);
    expect(ids).toEqual([FAVORITES_GROUP_ID, 'claude', 'codex', '__other__']);
    expect(
      result.current.resolvedGroups.find(
        (group) => group.id === FAVORITES_GROUP_ID,
      )?.models,
    ).toEqual([models[1]]);
    expect(
      result.current.resolvedGroups.find((group) => group.id === '__other__')
        ?.models,
    ).toEqual([models[3]]);
  });

  test('drops empty groups', () => {
    const { result } = renderHook(() =>
      useChatModelPicker(
        baseOptions({
          groups: [{ id: 'empty', label: 'Empty' }],
          models: [{ id: 'a', label: 'A' }],
        }),
      ),
    );
    const ids = result.current.resolvedGroups.map((group) => group.id);
    expect(ids).toEqual(['__other__']);
  });

  test('triggerLabel falls back to the placeholder when nothing is selected', () => {
    const { result } = renderHook(() => useChatModelPicker(baseOptions()));
    expect(result.current.triggerLabel).toBe('Select a model');
    expect(result.current.triggerSubLabel).toBeUndefined();
  });

  test('triggerLabel/triggerSubLabel reflect the selected model', () => {
    const { result } = renderHook(() =>
      useChatModelPicker(
        baseOptions({
          models: [{ id: 'sonnet', label: 'Sonnet', subLabel: 'Claude Code' }],
          selectedModelId: 'sonnet',
        }),
      ),
    );
    expect(result.current.triggerLabel).toBe('Sonnet');
    expect(result.current.triggerSubLabel).toBe('Claude Code');
  });

  test('disabledSet reflects disabledModelIds', () => {
    const { result } = renderHook(() =>
      useChatModelPicker(baseOptions({ disabledModelIds: ['gpt'] })),
    );
    expect(result.current.disabledSet.has('gpt')).toBe(true);
    expect(result.current.disabledSet.has('sonnet')).toBe(false);
  });

  describe('activeGroup default selection', () => {
    test('defaults to the first resolved group when nothing is selected', () => {
      const { result } = renderHook(() => useChatModelPicker(baseOptions()));
      expect(result.current.activeGroup?.id).toBe(FAVORITES_GROUP_ID);
    });

    test('defaults to the Favorites group when the selected model is a favorite', () => {
      const { result } = renderHook(() =>
        useChatModelPicker(baseOptions({ selectedModelId: 'opus' })),
      );
      expect(result.current.activeGroup?.id).toBe(FAVORITES_GROUP_ID);
    });

    test('defaults to the owning provider group for a non-favorite selection', () => {
      const { result } = renderHook(() =>
        useChatModelPicker(baseOptions({ selectedModelId: 'gpt' })),
      );
      expect(result.current.activeGroup?.id).toBe('codex');
    });

    test('is undefined when there are no models at all', () => {
      const { result } = renderHook(() =>
        useChatModelPicker(baseOptions({ groups: [], models: [] })),
      );
      expect(result.current.activeGroup).toBeUndefined();
    });
  });

  describe('onOpenChange', () => {
    test('opening resets the active group to the default and clears search', () => {
      const { result } = renderHook(() =>
        useChatModelPicker(baseOptions({ selectedModelId: 'gpt' })),
      );
      act(() => {
        result.current.onSelectRail('claude');
        result.current.setSearch('opus');
      });
      expect(result.current.activeGroup?.id).toBe('claude');

      act(() => {
        result.current.onOpenChange(true);
      });
      expect(result.current.open).toBe(true);
      expect(result.current.search).toBe('');
      expect(result.current.activeGroup?.id).toBe('codex');
    });

    test('closing does not reset the active group or search', () => {
      const { result } = renderHook(() => useChatModelPicker(baseOptions()));
      act(() => {
        result.current.onSelectRail('codex');
        result.current.setSearch('gpt');
      });
      act(() => {
        result.current.onOpenChange(false);
      });
      expect(result.current.open).toBe(false);
      expect(result.current.activeGroup?.id).toBe('codex');
      expect(result.current.search).toBe('gpt');
    });
  });

  test('onSelectRail switches the active group and clears search', () => {
    const { result } = renderHook(() => useChatModelPicker(baseOptions()));
    act(() => {
      result.current.setSearch('something');
    });
    act(() => {
      result.current.onSelectRail('codex');
    });
    expect(result.current.activeGroup?.id).toBe('codex');
    expect(result.current.search).toBe('');
  });

  describe('onSelectModel', () => {
    test('invokes onModelChange and closes the picker', () => {
      const onModelChange = vi.fn();
      const { result } = renderHook(() =>
        useChatModelPicker(baseOptions({ onModelChange })),
      );
      act(() => {
        result.current.onOpenChange(true);
      });
      act(() => {
        result.current.onSelectModel('sonnet');
      });
      expect(onModelChange).toHaveBeenCalledWith('sonnet');
      expect(result.current.open).toBe(false);
    });

    test('is a no-op for a disabled model', () => {
      const onModelChange = vi.fn();
      const { result } = renderHook(() =>
        useChatModelPicker(
          baseOptions({ disabledModelIds: ['gpt'], onModelChange }),
        ),
      );
      act(() => {
        result.current.onSelectModel('gpt');
      });
      expect(onModelChange).not.toHaveBeenCalled();
    });
  });

  test('setSearch replaces the search text', () => {
    const { result } = renderHook(() => useChatModelPicker(baseOptions()));
    act(() => {
      result.current.setSearch('sonnet');
    });
    expect(result.current.search).toBe('sonnet');
  });
});
