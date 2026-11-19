import { THEMES } from '@openthrottle/react-router-shadcn';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, test } from 'vitest';

import type { ConfigObject } from '~/global/data/data.appearance-config';
import { DEFAULT_APPEARANCE_CONFIG } from '~/global/data/data.appearance-config';
import { configAtom } from '~/global/data/data.atom-config';

import type { AppearancePaletteFieldProps } from '../AppearancePaletteField';
import { AppearancePaletteField } from '../AppearancePaletteField';

type Store = ReturnType<typeof createStore>;

const renderField = (
  props: AppearancePaletteFieldProps,
  initialConfig: Partial<ConfigObject> = {},
): { component: RenderResult; store: Store } => {
  const store = createStore();
  store.set(configAtom, { ...DEFAULT_APPEARANCE_CONFIG, ...initialConfig });

  const component = render(
    <Provider store={store}>
      <AppearancePaletteField {...props} />
    </Provider>,
  );

  return { component, store };
};

describe('AppearancePaletteField Component', () => {
  let component: RenderResult;
  let props: AppearancePaletteFieldProps;

  beforeEach(() => {
    props = {};
    ({ component } = renderField(props));
  });

  test('renders a tile per registered palette plus the no-palette tile', () => {
    expect(component.getAllByTestId('AppearancePaletteSwatch')).toHaveLength(
      THEMES.length + 1,
    );
  });

  test('selecting a palette persists its id to configAtom', async () => {
    component.unmount();
    const user = userEvent.setup();
    const { component: field, store } = renderField(props);
    const [firstTheme] = THEMES;
    if (firstTheme === undefined) {
      throw new Error('expected a bundled theme');
    }

    await user.click(
      field.getByRole('button', { name: new RegExp(firstTheme.label) }),
    );

    expect(store.get(configAtom).themeId).toBe(firstTheme.id);
  });

  test('selecting the no-palette tile clears themeId', async () => {
    component.unmount();
    const user = userEvent.setup();
    const [firstTheme] = THEMES;
    if (firstTheme === undefined) {
      throw new Error('expected a bundled theme');
    }
    const { component: field, store } = renderField(props, {
      themeId: firstTheme.id,
    });

    await user.click(field.getByRole('button', { name: /System default/ }));

    expect(store.get(configAtom).themeId).toBeUndefined();
  });

  test('marks the persisted palette as pressed', () => {
    component.unmount();
    const [firstTheme] = THEMES;
    if (firstTheme === undefined) {
      throw new Error('expected a bundled theme');
    }
    const { component: field } = renderField(props, {
      themeId: firstTheme.id,
    });

    expect(
      field.getByRole('button', { name: new RegExp(firstTheme.label) }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  describe('server render (before hydration)', () => {
    test('ignores the stored palette and mode so hydration matches', () => {
      const [firstTheme] = THEMES;
      if (firstTheme === undefined) {
        throw new Error('expected a bundled theme');
      }
      const store = createStore();
      store.set(configAtom, {
        ...DEFAULT_APPEARANCE_CONFIG,
        theme: 'dark',
        themeId: firstTheme.id,
      });
      const container = document.createElement('div');
      container.innerHTML = renderToString(
        <Provider store={store}>
          <AppearancePaletteField {...props} />
        </Provider>,
      );

      const pressed = container.querySelector('[aria-pressed="true"]');
      const firstChip = container.querySelector(
        `[data-theme-id="${firstTheme.id}"] span span`,
      );

      expect(pressed?.getAttribute('data-theme-id')).not.toBe(firstTheme.id);
      expect(firstChip?.getAttribute('style')).not.toContain(
        Object.values(firstTheme.dark)[0] ?? '<no dark token>',
      );
    });
  });
});
