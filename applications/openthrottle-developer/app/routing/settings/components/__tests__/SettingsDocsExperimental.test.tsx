import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsDocsExperimental } from '../SettingsDocsExperimental';
import { buildPersistentSettingKey } from '~/global/config/persistent-setting-storage';
import { DOCS_EXPERIMENTAL_ROWS } from '~/routing/settings/config/docs-experimental';

const STORAGE_KEY = buildPersistentSettingKey('docs.featureFlags');

describe('SettingsDocsExperimental', () => {
  let component: RenderResult;

  beforeEach(() => {
    window.localStorage.clear();
    component = render(<SettingsDocsExperimental />);
  });

  test('renders a switch per docs flag, all on by default', () => {
    for (const row of DOCS_EXPERIMENTAL_ROWS) {
      const switchEl = component.getByRole('switch', { name: row.label });
      expect(switchEl).toHaveAttribute('data-state', 'checked');
    }
  });

  test('toggling a switch persists the flipped flag', async () => {
    const user = userEvent.setup();
    const switchEl = component.getByRole('switch', { name: 'Search' });

    await user.click(switchEl);

    expect(switchEl).toHaveAttribute('data-state', 'unchecked');

    const stored: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? '{}',
    );
    expect(stored).toMatchObject({ search: false, toc: true });
  });
});
