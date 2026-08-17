import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, useSearchParams } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SettingsKeysHelpTrigger } from '../SettingsKeysHelpTrigger';
import { SETTINGS_KEYS_COPY } from '~/routing/settings/data/data.copy';

function renderTrigger(
  initialEntries: readonly string[] = ['/'],
): RenderResult {
  const Component = () => {
    const [searchParams] = useSearchParams();

    return (
      <div>
        <SettingsKeysHelpTrigger />
        <output data-testid="search">{searchParams.toString()}</output>
      </div>
    );
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub initialEntries={[...initialEntries]} />);
}

describe('SettingsKeysHelpTrigger Component', () => {
  test('renders the trigger label', () => {
    const component = renderTrigger();

    expect(
      component.getByRole('button', { name: SETTINGS_KEYS_COPY.triggerLabel }),
    ).toBeInTheDocument();
  });

  test('sets modal=keys-help on click, preserving other params', async () => {
    const user = userEvent.setup();
    const component = renderTrigger(['/?serviceAccountId=abc']);

    await user.click(
      component.getByRole('button', { name: SETTINGS_KEYS_COPY.triggerLabel }),
    );

    expect(component.getByTestId('search')).toHaveTextContent(
      'serviceAccountId=abc&modal=keys-help',
    );
  });
});
