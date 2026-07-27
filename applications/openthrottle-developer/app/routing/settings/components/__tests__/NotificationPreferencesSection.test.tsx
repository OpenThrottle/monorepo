import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NotificationPreferencesSection } from '../NotificationPreferencesSection';
import { NOTIFICATION_PREFERENCE_ROWS } from '~/routing/settings/config/notification-preferences';

// Spy on every toast entry point so we can assert the placeholder panel stays
// silent on toggle (the phantom-toast regression this guards against).
const toastMock = vi.hoisted(() => {
  const fn = vi.fn();
  return Object.assign(fn, {
    dismiss: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    message: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  });
});

vi.mock('@openthrottle/react-router-shadcn', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-shadcn')>();
  return { ...actual, toast: toastMock };
});

describe('NotificationPreferencesSection', () => {
  let component: RenderResult;

  beforeEach(() => {
    vi.clearAllMocks();
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

  test('should not fire any toast when a switch is toggled', async () => {
    const user = userEvent.setup();
    const first = NOTIFICATION_PREFERENCE_ROWS[0];
    const switchEl = component.getByRole('switch', { name: first.label });

    await user.click(switchEl);

    expect(toastMock).not.toHaveBeenCalled();
    expect(toastMock.loading).not.toHaveBeenCalled();
    expect(toastMock.dismiss).not.toHaveBeenCalled();
    expect(toastMock.success).not.toHaveBeenCalled();
    expect(toastMock.error).not.toHaveBeenCalled();
  });
});
