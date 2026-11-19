import { renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { DEFAULT_APPEARANCE_CONFIG } from '~/global/data/data.appearance-config';
import { configAtom } from '~/global/data/data.atom-config';

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

const ThemeProbe = (): React.ReactElement => {
  // Hooks
  const theme = useBlogEditorTheme();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <span>{theme}</span>;
};

describe('useBlogEditorTheme', () => {
  test('resolves the default theme on the server, whatever is stored', () => {
    const store = createStore();
    store.set(configAtom, { ...DEFAULT_APPEARANCE_CONFIG, theme: 'dark' });

    const markup = renderToString(
      <Provider store={store}>
        <ThemeProbe />
      </Provider>,
    );

    // Default `system` with no OS preference on the server resolves light.
    expect(markup).toContain('light');
    expect(markup).not.toContain('vs-dark');
  });

  test('follows an explicit dark or light appearance', () => {
    expect(renderWithTheme('dark').result.current).toBe('vs-dark');
    expect(renderWithTheme('light').result.current).toBe('light');
  });

  test('system follows the OS preference (light under jsdom)', () => {
    expect(renderWithTheme('system').result.current).toBe('light');
  });
});
