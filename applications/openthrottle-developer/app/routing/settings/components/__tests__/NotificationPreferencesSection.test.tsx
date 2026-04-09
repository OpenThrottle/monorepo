import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotificationPreferencesSection } from '../NotificationPreferencesSection';
import { NOTIFICATION_PREFERENCE_ROWS } from '~/routing/settings/config/notification-preferences';

describe('NotificationPreferencesSection', () => {
  let component: RenderResult;

  beforeEach(() => {
    const Component = () => <NotificationPreferencesSection />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('should render preference rows from stub config', () => {
    for (const row of NOTIFICATION_PREFERENCE_ROWS) {
      expect(
        component.getByTestId(`notification-pref-${row.id}`),
      ).toBeInTheDocument();
    }
  });

  test('should toggle a switch when clicked', async () => {
    const user = userEvent.setup();
    const first = NOTIFICATION_PREFERENCE_ROWS[0];
    const switchEl = component.getByRole('switch', { name: first.label });
    const expectedInitial = first.defaultEnabled ? 'checked' : 'unchecked';
    const expectedAfter = first.defaultEnabled ? 'unchecked' : 'checked';

    expect(switchEl).toHaveAttribute('data-state', expectedInitial);

    await user.click(switchEl);

    expect(switchEl).toHaveAttribute('data-state', expectedAfter);
  });
});
