import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { THEMES } from '@openthrottle/react-router-shadcn';
import { Provider, createStore } from 'jotai';
import { beforeEach, describe, expect, test } from 'vitest';
import { AppearancePaletteField } from '../AppearancePaletteField';
import type { AppearancePaletteFieldProps } from '../AppearancePaletteField';
import {
  configAtom,
  DEFAULT_APPEARANCE_CONFIG,
} from '~/global/data/atom.config';
import type { ConfigObject } from '~/global/data/atom.config';

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

    await user.click(
      field.getByRole('button', { name: new RegExp(firstTheme.label) }),
    );

    expect(store.get(configAtom).themeId).toBe(firstTheme.id);
  });

  test('selecting the no-palette tile clears themeId', async () => {
    component.unmount();
    const user = userEvent.setup();
    const [firstTheme] = THEMES;
    const { component: field, store } = renderField(props, {
      themeId: firstTheme.id,
    });

    await user.click(field.getByRole('button', { name: /System default/ }));

    expect(store.get(configAtom).themeId).toBeUndefined();
  });

  test('marks the persisted palette as pressed', () => {
    component.unmount();
    const [firstTheme] = THEMES;
    const { component: field } = renderField(props, {
      themeId: firstTheme.id,
    });

    expect(
      field.getByRole('button', { name: new RegExp(firstTheme.label) }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
