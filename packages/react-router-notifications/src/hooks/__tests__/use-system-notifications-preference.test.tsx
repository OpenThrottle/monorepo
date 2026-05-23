import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { NOTIFICATIONS_STORAGE_KEY } from '../../config/index';
import { useNotificationsSystemPreferences } from '../use-system-notifications-preference';

function TestConsumer(): React.ReactElement {
  const { preference, setPreference } = useNotificationsSystemPreferences();
  return (
    <div>
      <span data-testid="enabled">{String(preference.enabled)}</span>
      <span data-testid="only-background">
        {String(preference.onlyWhenBackground === true)}
      </span>
      <button
        data-testid="toggle-enabled"
        onClick={() =>
          setPreference({ ...preference, enabled: !preference.enabled })
        }
        type="button"
      >
        Toggle enabled
      </button>
      <button
        data-testid="toggle-only-background"
        onClick={() =>
          setPreference({
            ...preference,
            onlyWhenBackground:
              preference.onlyWhenBackground === true ? undefined : true,
          })
        }
        type="button"
      >
        Toggle only background
      </button>
    </div>
  );
}

describe('useNotificationsSystemPreferences', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('defaults to disabled when localStorage is empty', () => {
    const { getByTestId } = render(<TestConsumer />);
    expect(getByTestId('enabled').textContent).toBe('false');
    expect(getByTestId('only-background').textContent).toBe('false');
  });

  test('setPreference persists to localStorage and updates state', async () => {
    const user = userEvent.setup();
    const { getByTestId } = render(<TestConsumer />);
    expect(getByTestId('enabled').textContent).toBe('false');

    await user.click(getByTestId('toggle-enabled'));
    expect(getByTestId('enabled').textContent).toBe('true');
    expect(
      JSON.parse(
        window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) ?? '{}',
      ),
    ).toEqual({
      enabled: true,
      onlyWhenBackground: undefined,
    });

    await user.click(getByTestId('toggle-only-background'));
    expect(getByTestId('only-background').textContent).toBe('true');
    expect(
      JSON.parse(
        window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) ?? '{}',
      ),
    ).toEqual({
      enabled: true,
      onlyWhenBackground: true,
    });
  });

  test('storage event from another tab updates preference state', async () => {
    const { getByTestId } = render(<TestConsumer />);
    expect(getByTestId('enabled').textContent).toBe('false');

    window.localStorage.setItem(
      NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify({ enabled: true }),
    );
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: NOTIFICATIONS_STORAGE_KEY,
        newValue: JSON.stringify({ enabled: true }),
        oldValue: null,
        storageArea: localStorage,
      }),
    );

    await waitFor(() => {
      expect(getByTestId('enabled').textContent).toBe('true');
    });
  });

  test('storage event for unrelated key does not change preference state', async () => {
    const { getByTestId } = render(<TestConsumer />);
    expect(getByTestId('enabled').textContent).toBe('false');

    window.localStorage.setItem('other-key', JSON.stringify({ enabled: true }));
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'other-key',
        newValue: JSON.stringify({ enabled: true }),
        oldValue: null,
        storageArea: localStorage,
      }),
    );

    await Promise.resolve();
    expect(getByTestId('enabled').textContent).toBe('false');
  });
});
