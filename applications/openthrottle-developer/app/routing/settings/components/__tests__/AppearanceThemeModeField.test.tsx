import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { beforeEach, describe, expect, test } from 'vitest';
import { AppearanceThemeModeField } from '../AppearanceThemeModeField';
import type { AppearanceThemeModeFieldProps } from '../AppearanceThemeModeField';
import {
  configAtom,
  DEFAULT_APPEARANCE_CONFIG,
} from '~/global/data/atom.config';
import type { ConfigObject } from '~/global/data/atom.config';

type Store = ReturnType<typeof createStore>;

const renderField = (
  props: AppearanceThemeModeFieldProps,
  initialConfig: Partial<ConfigObject> = {},
): { component: RenderResult; store: Store } => {
  const store = createStore();
  store.set(configAtom, { ...DEFAULT_APPEARANCE_CONFIG, ...initialConfig });

  const component = render(
    <Provider store={store}>
      <AppearanceThemeModeField {...props} />
    </Provider>,
  );

  return { component, store };
};

describe('AppearanceThemeModeField Component', () => {
  let component: RenderResult;
  let props: AppearanceThemeModeFieldProps;

  beforeEach(() => {
    props = {};
    ({ component } = renderField(props));
  });

  test('renders the color-mode toggle and the default help line', () => {
    expect(component.getByLabelText('Color mode')).toBeInTheDocument();
    expect(
      component.getByText(
        new RegExp(`Default: ${DEFAULT_APPEARANCE_CONFIG.theme}`),
      ),
    ).toBeInTheDocument();
  });

  test('picking a mode persists it to configAtom', async () => {
    component.unmount();
    const user = userEvent.setup();
    const { component: field, store } = renderField(props);

    await user.click(field.getByLabelText('Dark mode'));

    expect(store.get(configAtom).theme).toBe('dark');
  });

  test('leaves the other appearance fields untouched', async () => {
    component.unmount();
    const user = userEvent.setup();
    const { component: field, store } = renderField(props, {
      brand: '#ff5500',
      themeId: 'openthrottle',
    });

    await user.click(field.getByLabelText('Light mode'));

    expect(store.get(configAtom).brand).toBe('#ff5500');
    expect(store.get(configAtom).themeId).toBe('openthrottle');
  });
});
