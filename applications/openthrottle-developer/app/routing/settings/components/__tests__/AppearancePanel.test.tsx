import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { beforeEach, describe, expect, test } from 'vitest';
import { AppearancePanel } from '../AppearancePanel';
import type { AppearancePanelProps } from '../AppearancePanel';
import {
  configAtom,
  DEFAULT_APPEARANCE_CONFIG,
} from '~/global/data/atom.config';
import type { ConfigObject } from '~/global/data/atom.config';

type Store = ReturnType<typeof createStore>;

const renderPanel = (
  props: AppearancePanelProps,
  initialConfig: Partial<ConfigObject> = {},
): { component: RenderResult; store: Store } => {
  const store = createStore();
  store.set(configAtom, { ...DEFAULT_APPEARANCE_CONFIG, ...initialConfig });

  const component = render(
    <Provider store={store}>
      <AppearancePanel {...props} />
    </Provider>,
  );

  return { component, store };
};

describe('AppearancePanel Component', () => {
  let component: RenderResult;
  let props: AppearancePanelProps;

  beforeEach(() => {
    props = {};
    ({ component } = renderPanel(props));
  });

  test('renders the Appearance heading and section labels', () => {
    expect(
      component.getByRole('heading', { name: 'Appearance' }),
    ).toBeInTheDocument();
    expect(component.getByText('Theme')).toBeInTheDocument();
    expect(component.getByText('Theme palette')).toBeInTheDocument();
    expect(component.getByText('Brand color')).toBeInTheDocument();
  });

  test('shows theme-default copy and hides the reset button when brand is unset', () => {
    expect(
      component.getByText(
        new RegExp(
          `Using theme default \\(.*\\)\\. Pick a color to override\\.`,
        ),
      ),
    ).toBeInTheDocument();
    expect(
      component.queryByRole('button', { name: 'Use theme default' }),
    ).not.toBeInTheDocument();
  });

  test('shows custom-brand copy and the reset button when brand is set', () => {
    component.unmount();
    const { component: customComponent } = renderPanel(props, {
      brand: '#ff5500',
    });

    expect(
      customComponent.getByText('Custom brand color applied (#ff5500).'),
    ).toBeInTheDocument();
    expect(
      customComponent.getByRole('button', { name: 'Use theme default' }),
    ).toBeInTheDocument();
  });

  test('reset clears the brand override in configAtom', async () => {
    component.unmount();
    const user = userEvent.setup();
    const { component: customComponent, store } = renderPanel(props, {
      brand: '#ff5500',
    });

    await user.click(
      customComponent.getByRole('button', { name: 'Use theme default' }),
    );

    expect(store.get(configAtom).brand).toBeUndefined();
  });

  test('changing the brand color input updates configAtom', () => {
    component.unmount();
    const { component: customComponent, store } = renderPanel(props);
    const colorInput = customComponent.getByLabelText('Brand color');

    fireEvent.change(colorInput, { target: { value: '#aabbcc' } });

    expect(store.get(configAtom).brand).toBe('#aabbcc');
  });

  test('expanding the CSS-tokens section lists brand override tokens', async () => {
    const user = userEvent.setup();

    await user.click(
      component.getByRole('button', {
        name: 'CSS tokens affected by a custom brand',
      }),
    );

    expect(component.getByText(':root')).toBeInTheDocument();
  });
});
