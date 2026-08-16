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
import { APPEARANCE_SECTIONS } from '~/routing/settings/data/data.appearance';

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

  test('renders the preview surface above the registry sections', () => {
    const preview = component.getByTestId('AppearancePreview');
    const [firstSection] = component.getAllByTestId('AppearanceSection');

    expect(preview).toBeInTheDocument();
    expect(
      preview.compareDocumentPosition(firstSection) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test('renders one section per registry entry, in registry order', () => {
    const sections = component.getAllByTestId('AppearanceSection');

    expect(sections).toHaveLength(APPEARANCE_SECTIONS.length);
    expect(
      sections.map((section) => section.getAttribute('data-section-id')),
    ).toEqual(APPEARANCE_SECTIONS.map((section) => section.id));
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

  test('no longer lists raw CSS token names', () => {
    expect(
      component.queryByRole('button', {
        name: 'CSS tokens affected by a custom brand',
      }),
    ).not.toBeInTheDocument();
  });
});
