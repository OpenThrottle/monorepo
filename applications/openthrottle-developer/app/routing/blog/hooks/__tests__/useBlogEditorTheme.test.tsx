import { renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  configAtom,
  DEFAULT_APPEARANCE_CONFIG,
} from '~/global/data/atom.config';

import { useBlogEditorTheme } from '../useBlogEditorTheme';

const renderWithTheme = (theme: 'dark' | 'light' | 'system') => {
  const store = createStore();

  store.set(configAtom, { ...DEFAULT_APPEARANCE_CONFIG, theme });

  return renderHook(() => useBlogEditorTheme(), {
    wrapper: ({ children }: { readonly children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  });
};

describe('useBlogEditorTheme', () => {
  test('follows an explicit dark or light appearance', () => {
    expect(renderWithTheme('dark').result.current).toBe('vs-dark');
    expect(renderWithTheme('light').result.current).toBe('light');
  });

  test('system follows the OS preference (light under jsdom)', () => {
    expect(renderWithTheme('system').result.current).toBe('light');
  });
});
