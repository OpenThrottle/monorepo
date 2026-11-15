import {
  APPEARANCE_BRAND_OVERRIDE_KEYS,
  APPEARANCE_THEME_COLOR_TOKEN_KEYS,
  buildAppearanceRootCssBlock,
  DEFAULT_BRAND_HSL,
} from '@openthrottle/react-router-utils';
// eslint-disable-next-line openthrottle/no-fire-event -- `<input type="color">` has no keyboard/pointer affordance userEvent can drive; a change event is the only way to simulate the native picker
import { fireEvent, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { Route } from '@/app/routes/+types/settings.appearance';
import {
  type ConfigObject,
  DEFAULT_APPEARANCE_CONFIG,
} from '~/global/data/data.appearance-config';
import { configAtom } from '~/global/data/data.atom-config';
import { buildRootMatch } from '~/testing/buildRootMatch';

import SettingsAppearance from '../settings.appearance';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/settings.appearance',
    loaderData: undefined,
    params: {},
    pathname: '/',
  },
];

/**
 * @description Legacy `settings.cusomization` route was consolidated into `settings.appearance`.
 */
describe('routes/settings.appearance.tsx (customization)', () => {
  const renderAppearance = (initialConfig: Partial<ConfigObject> = {}) => {
    const store = createStore();
    store.set(configAtom, { ...DEFAULT_APPEARANCE_CONFIG, ...initialConfig });

    const view = render(
      <Provider store={store}>
        <MemoryRouter>
          <SettingsAppearance
            actionData={undefined}
            loaderData={undefined}
            matches={matches}
            params={{}}
          />
        </MemoryRouter>
      </Provider>,
    );

    return { store, ...view };
  };

  beforeEach(() => {
    localStorage.clear();
  });

  test('should render Theme and Brand sections', () => {
    const component = renderAppearance();

    expect(
      component.getByRole('heading', { name: 'Appearance' }),
    ).toBeInTheDocument();
    expect(component.getByText('Theme')).toBeInTheDocument();
    expect(component.getByText('Brand color')).toBeInTheDocument();
    expect(component.getByLabelText('Color mode')).toBeInTheDocument();
    expect(component.getByLabelText('Brand color')).toBeInTheDocument();
  });

  describe('when brand uses theme default', () => {
    test('shows default-state copy and hides reset button', () => {
      const component = renderAppearance();

      expect(
        component.getByText(
          `Using theme default (${DEFAULT_BRAND_HSL}). Pick a color to override.`,
        ),
      ).toBeInTheDocument();
      expect(
        component.queryByRole('button', { name: 'Use theme default' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when brand is customized', () => {
    test('shows custom copy and reset button', () => {
      const component = renderAppearance({
        brand: '#ff5500',
        theme: 'light',
      });

      expect(
        component.getByText('Custom brand color applied (#ff5500).'),
      ).toBeInTheDocument();
      expect(
        component.getByRole('button', { name: 'Use theme default' }),
      ).toBeInTheDocument();
    });

    test('reset clears brand override in configAtom', async () => {
      const user = userEvent.setup();
      const { store, ...component } = renderAppearance({
        brand: '#ff5500',
        theme: 'light',
      });

      await user.click(
        component.getByRole('button', { name: 'Use theme default' }),
      );

      expect(store.get(configAtom).brand).toBeUndefined();
    });
  });

  describe('when theme is changed', () => {
    test('persists dark mode in configAtom', async () => {
      const user = userEvent.setup();
      const { store, ...component } = renderAppearance();

      expect(
        component.getByText(
          new RegExp(`Default: ${DEFAULT_APPEARANCE_CONFIG.theme}`),
        ),
      ).toBeInTheDocument();

      await user.click(component.getByLabelText('Dark mode'));

      expect(store.get(configAtom).theme).toBe('dark');
    });

    test('selecting System updates configAtom to theme: system', async () => {
      const user = userEvent.setup();
      // Start from an explicit mode so selecting System is a real change.
      const { store, ...component } = renderAppearance({ theme: 'light' });

      await user.click(component.getByLabelText('System mode'));

      expect(store.get(configAtom).theme).toBe('system');
    });
  });

  describe('when brand color input changes', () => {
    test('persists brand in configAtom', () => {
      const { store, ...component } = renderAppearance();
      const colorInput = component.getByLabelText('Brand color');

      fireEvent.change(colorInput, { target: { value: '#aabbcc' } });

      expect(store.get(configAtom).brand).toBe('#aabbcc');
    });
  });

  describe('CSS token plumbing', () => {
    test('no longer surfaces raw token names in the UI', () => {
      const component = renderAppearance();

      expect(
        component.queryByRole('button', {
          name: 'CSS tokens affected by a custom brand',
        }),
      ).not.toBeInTheDocument();
      for (const token of APPEARANCE_THEME_COLOR_TOKEN_KEYS) {
        expect(component.queryByText(token)).not.toBeInTheDocument();
      }
    });

    test('a custom brand still writes every brand override key', () => {
      const css = buildAppearanceRootCssBlock('#ff5500');

      for (const token of APPEARANCE_BRAND_OVERRIDE_KEYS) {
        expect(css).toContain(`${token}: #ff5500;`);
      }
    });
  });
});
