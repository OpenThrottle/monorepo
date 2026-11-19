import { renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import type { ConfigObject } from '~/global/data/data.appearance-config';
import { DEFAULT_APPEARANCE_CONFIG } from '~/global/data/data.appearance-config';
import { configAtom } from '~/global/data/data.atom-config';

import { useHydratedAppearanceConfig } from '../useHydratedAppearanceConfig';

const STORED_CONFIG: ConfigObject = {
  ...DEFAULT_APPEARANCE_CONFIG,
  brand: '#ff5500',
  theme: 'dark',
  themeId: 'one-dark-pro',
};

const createStoredStore = (): ReturnType<typeof createStore> => {
  const store = createStore();
  store.set(configAtom, STORED_CONFIG);
  return store;
};

const Probe = (): React.ReactElement => {
  // Hooks
  const { config } = useHydratedAppearanceConfig();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <span>
      {config.theme}:{config.brand ?? 'no-brand'}
    </span>
  );
};

describe('useHydratedAppearanceConfig', () => {
  test('renders the default config on the server, whatever is stored', () => {
    const markup = renderToString(
      <Provider store={createStoredStore()}>
        <Probe />
      </Provider>,
    );

    // The root Layout's brand `<style>` depends on this: no stored brand may
    // reach the server (or hydration) render.
    expect(markup).toContain(`${DEFAULT_APPEARANCE_CONFIG.theme}`);
    expect(markup).toContain('no-brand');
    expect(markup).not.toContain('#ff5500');
  });

  test('returns the stored config once hydrated', () => {
    const store = createStoredStore();
    const { result } = renderHook(
      () => {
        return useHydratedAppearanceConfig();
      },
      {
        wrapper: ({ children }) => {
          return <Provider store={store}>{children}</Provider>;
        },
      },
    );

    expect(result.current.isHydrated).toBe(true);
    expect(result.current.config).toEqual(STORED_CONFIG);
  });
});
