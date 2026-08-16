import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { beforeEach, describe, expect, test } from 'vitest';
import { AppearanceBrandColorField } from '../AppearanceBrandColorField';
import type { AppearanceBrandColorFieldProps } from '../AppearanceBrandColorField';
import {
  configAtom,
  DEFAULT_APPEARANCE_CONFIG,
} from '~/global/data/atom.config';
import type { ConfigObject } from '~/global/data/atom.config';

type Store = ReturnType<typeof createStore>;

const renderField = (
  props: AppearanceBrandColorFieldProps,
  initialConfig: Partial<ConfigObject> = {},
): { component: RenderResult; store: Store } => {
  const store = createStore();
  store.set(configAtom, { ...DEFAULT_APPEARANCE_CONFIG, ...initialConfig });

  const component = render(
    <Provider store={store}>
      <AppearanceBrandColorField {...props} />
    </Provider>,
  );

  return { component, store };
};

describe('AppearanceBrandColorField Component', () => {
  let component: RenderResult;
  let props: AppearanceBrandColorFieldProps;

  beforeEach(() => {
    props = {};
    ({ component } = renderField(props));
  });

  test('hides the reset button while the brand is unset', () => {
    expect(
      component.queryByRole('button', { name: 'Use theme default' }),
    ).not.toBeInTheDocument();
  });

  test('persists a picked color to configAtom', () => {
    component.unmount();
    const { component: field, store } = renderField(props);

    // `<input type="color">` has no keyboard/pointer affordance userEvent can
    // drive; a change event is the only way to simulate the native picker.
    fireEvent.change(field.getByLabelText('Brand color'), {
      target: { value: '#aabbcc' },
    });

    expect(store.get(configAtom).brand).toBe('#aabbcc');
  });

  test('reset clears the override and reports the custom value until then', async () => {
    component.unmount();
    const user = userEvent.setup();
    const { component: field, store } = renderField(props, {
      brand: '#ff5500',
    });

    expect(
      field.getByText('Custom brand color applied (#ff5500).'),
    ).toBeInTheDocument();

    await user.click(field.getByRole('button', { name: 'Use theme default' }));

    expect(store.get(configAtom).brand).toBeUndefined();
  });
});
