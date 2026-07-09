import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import SettingsAppearance from '../settings.appearance';
import {
  APPEARANCE_BRAND_OVERRIDE_KEYS,
  APPEARANCE_THEME_COLOR_TOKEN_KEYS,
  DEFAULT_BRAND_HSL,
} from '@openthrottle/react-router-utils';
import {
  configAtom,
  DEFAULT_APPEARANCE_CONFIG,
  type ConfigObject,
} from '~/global/data/atom.config';
import { getSettingsDiagnosticsLoaderData } from '~/routing/settings/utils/settings-diagnostics-loader-data';
import { buildRootMatch } from '~/testing/root-match-fixture';
import type { Route } from '@/app/routes/+types/settings.appearance';

const matches: Route.ComponentProps['matches'] = [
  buildRootMatch(),
  {
    handle: undefined,
    id: 'routes/settings.appearance',
    loaderData: getSettingsDiagnosticsLoaderData(),
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
            loaderData={getSettingsDiagnosticsLoaderData()}
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
    renderAppearance();

    expect(
      screen.getByRole('heading', { name: 'Appearance' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Brand color')).toBeInTheDocument();
    expect(screen.getByLabelText('Color mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Brand color')).toBeInTheDocument();
  });

  describe('when brand uses theme default', () => {
    test('shows default-state copy and hides reset button', () => {
      renderAppearance();

      expect(
        screen.getByText(
          `Using theme default (${DEFAULT_BRAND_HSL}). Pick a color to override.`,
        ),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Use theme default' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when brand is customized', () => {
    test('shows custom copy and reset button', () => {
      renderAppearance({
        brand: '#ff5500',
        theme: 'light',
      });

      expect(
        screen.getByText('Custom brand color applied (#ff5500).'),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Use theme default' }),
      ).toBeInTheDocument();
    });

    test('reset clears brand override in configAtom', async () => {
      const user = userEvent.setup();
      const { store } = renderAppearance({
        brand: '#ff5500',
        theme: 'light',
      });

      await user.click(
        screen.getByRole('button', { name: 'Use theme default' }),
      );

      expect(store.get(configAtom).brand).toBeUndefined();
    });
  });

  describe('when theme is changed', () => {
    test('persists dark mode in configAtom', async () => {
      const user = userEvent.setup();
      const { store } = renderAppearance();

      expect(
        screen.getByText(
          new RegExp(`Default: ${DEFAULT_APPEARANCE_CONFIG.theme}`),
        ),
      ).toBeInTheDocument();

      await user.click(screen.getByLabelText('Dark mode'));

      expect(store.get(configAtom).theme).toBe('dark');
    });

    test('selecting System updates configAtom to theme: system', async () => {
      const user = userEvent.setup();
      // Start from an explicit mode so selecting System is a real change.
      const { store } = renderAppearance({ theme: 'light' });

      await user.click(screen.getByLabelText('System mode'));

      expect(store.get(configAtom).theme).toBe('system');
    });
  });

  describe('when brand color input changes', () => {
    test('persists brand in configAtom', () => {
      const { store } = renderAppearance();
      const colorInput = screen.getByLabelText('Brand color');

      fireEvent.change(colorInput, { target: { value: '#aabbcc' } });

      expect(store.get(configAtom).brand).toBe('#aabbcc');
    });
  });

  describe('CSS token discoverability', () => {
    test('lists brand override and @theme tokens when expanded', async () => {
      const user = userEvent.setup();
      renderAppearance();

      await user.click(
        screen.getByRole('button', {
          name: 'CSS tokens affected by a custom brand',
        }),
      );

      for (const token of APPEARANCE_BRAND_OVERRIDE_KEYS) {
        expect(screen.getByText(token)).toBeInTheDocument();
      }
      for (const token of APPEARANCE_THEME_COLOR_TOKEN_KEYS) {
        expect(screen.getByText(token)).toBeInTheDocument();
      }
    });
  });
});
