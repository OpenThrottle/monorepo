import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { beforeEach, describe, expect, test } from 'vitest';
import { AppearanceMotionField } from '../AppearanceMotionField';
import type { AppearanceMotionFieldProps } from '../AppearanceMotionField';
import {
  configAtom,
  DEFAULT_APPEARANCE_CONFIG,
} from '~/global/data/atom.config';
import type { ConfigObject } from '~/global/data/atom.config';

type Store = ReturnType<typeof createStore>;

const renderField = (
  props: AppearanceMotionFieldProps,
  initialConfig: Partial<ConfigObject> = {},
): { component: RenderResult; store: Store } => {
  const store = createStore();
  store.set(configAtom, { ...DEFAULT_APPEARANCE_CONFIG, ...initialConfig });

  const component = render(
    <Provider store={store}>
      <AppearanceMotionField {...props} />
    </Provider>,
  );

  return { component, store };
};

describe('AppearanceMotionField Component', () => {
  let component: RenderResult;
  let props: AppearanceMotionFieldProps;

  beforeEach(() => {
    props = {};
    ({ component } = renderField(props));
  });

  test('offers both motion options and defaults to following the system', () => {
    expect(
      component.getByRole('radio', { name: 'Follow system' }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      component.getByRole('radio', { name: 'Reduce motion' }),
    ).toHaveAttribute('aria-checked', 'false');
  });

  test('choosing Reduce motion persists always to configAtom', async () => {
    component.unmount();
    const user = userEvent.setup();
    const { component: field, store } = renderField(props);

    await user.click(field.getByRole('radio', { name: 'Reduce motion' }));

    expect(store.get(configAtom).reducedMotion).toBe('always');
  });

  test('reflects a persisted always preference', () => {
    component.unmount();
    const { component: field } = renderField(props, {
      reducedMotion: 'always',
    });

    expect(field.getByRole('radio', { name: 'Reduce motion' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});
