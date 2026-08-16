import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { beforeEach, describe, expect, test } from 'vitest';
import { AppearanceResetField } from '../AppearanceResetField';
import type { AppearanceResetFieldProps } from '../AppearanceResetField';
import {
  configAtom,
  DEFAULT_APPEARANCE_CONFIG,
} from '~/global/data/atom.config';
import type { ConfigObject } from '~/global/data/atom.config';

type Store = ReturnType<typeof createStore>;

const renderField = (
  props: AppearanceResetFieldProps,
  initialConfig: Partial<ConfigObject> = {},
): { component: RenderResult; store: Store } => {
  const store = createStore();
  store.set(configAtom, { ...DEFAULT_APPEARANCE_CONFIG, ...initialConfig });

  const component = render(
    <Provider store={store}>
      <AppearanceResetField {...props} />
    </Provider>,
  );

  return { component, store };
};

describe('AppearanceResetField Component', () => {
  let component: RenderResult;
  let props: AppearanceResetFieldProps;

  beforeEach(() => {
    props = {};
    ({ component } = renderField(props));
  });

  test('is disabled when the config already matches the defaults', () => {
    expect(
      component.getByRole('button', { name: 'Reset appearance' }),
    ).toBeDisabled();
  });

  test('resets immediately when only one field differs', async () => {
    component.unmount();
    const user = userEvent.setup();
    const { component: field, store } = renderField(props, { theme: 'dark' });

    await user.click(field.getByRole('button', { name: 'Reset appearance' }));

    expect(store.get(configAtom)).toEqual(DEFAULT_APPEARANCE_CONFIG);
  });

  test('confirms first when several fields differ', async () => {
    component.unmount();
    const user = userEvent.setup();
    const { component: field, store } = renderField(props, {
      brand: '#ff5500',
      theme: 'dark',
      themeId: 'openthrottle',
    });

    await user.click(field.getByRole('button', { name: 'Reset appearance' }));

    // Still untouched until the prompt is answered.
    expect(store.get(configAtom).theme).toBe('dark');

    await user.click(field.getByRole('button', { name: 'Reset' }));

    expect(store.get(configAtom)).toEqual(DEFAULT_APPEARANCE_CONFIG);
  });

  test('canceling the prompt leaves the config alone', async () => {
    component.unmount();
    const user = userEvent.setup();
    const { component: field, store } = renderField(props, {
      brand: '#ff5500',
      theme: 'dark',
    });

    await user.click(field.getByRole('button', { name: 'Reset appearance' }));
    await user.click(field.getByRole('button', { name: 'Cancel' }));

    expect(store.get(configAtom).brand).toBe('#ff5500');
    expect(store.get(configAtom).theme).toBe('dark');
  });
});
