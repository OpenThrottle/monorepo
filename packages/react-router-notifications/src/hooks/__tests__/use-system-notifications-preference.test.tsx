import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
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
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      clear: () => {
        for (const key of Object.keys(storage)) delete storage[key];
      },
      getItem: (key: string) => storage[key] ?? null,
      key: () => null,
      length: 0,
      removeItem: (key: string) => {
        delete storage[key];
      },
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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
    expect(JSON.parse(storage[NOTIFICATIONS_STORAGE_KEY] ?? '{}')).toEqual({
      enabled: true,
      onlyWhenBackground: undefined,
    });

    await user.click(getByTestId('toggle-only-background'));
    expect(getByTestId('only-background').textContent).toBe('true');
    expect(JSON.parse(storage[NOTIFICATIONS_STORAGE_KEY] ?? '{}')).toEqual({
      enabled: true,
      onlyWhenBackground: true,
    });
  });
});
