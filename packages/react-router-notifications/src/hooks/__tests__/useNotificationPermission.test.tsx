import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useNotificationPermission } from '../useNotificationPermission';
import { type NotificationPermissionState } from '../../types';

function TestConsumer(): React.ReactElement {
  const { isSecureContext, isSupported, permission, requestPermission } =
    useNotificationPermission();
  return (
    <div>
      <span data-testid="permission">{permission}</span>
      <span data-testid="supported">{String(isSupported)}</span>
      <span data-testid="secure">{String(isSecureContext)}</span>
      <button
        data-testid="request"
        onClick={() => void requestPermission()}
        type="button"
      >
        Request
      </button>
    </div>
  );
}

describe('useNotificationPermission', () => {
  const originalIsSecureContext = Object.getOwnPropertyDescriptor(
    globalThis,
    'isSecureContext',
  );

  beforeEach(() => {
    vi.stubGlobal('isSecureContext', true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalIsSecureContext) {
      Object.defineProperty(globalThis, 'isSecureContext', {
        configurable: true,
        value: originalIsSecureContext.value,
        writable: originalIsSecureContext.writable,
      });
    }
  });

  test('returns unsupported when Notification API is not available', () => {
    vi.stubGlobal('Notification', undefined);
    const { getByTestId } = render(<TestConsumer />);
    expect(getByTestId('permission').textContent).toBe('unsupported');
    expect(getByTestId('supported').textContent).toBe('false');
  });

  test('returns unsupported when not in secure context', () => {
    vi.stubGlobal('isSecureContext', false);
    vi.stubGlobal('Notification', { permission: 'default' });
    const { getByTestId } = render(<TestConsumer />);
    expect(getByTestId('permission').textContent).toBe('unsupported');
    expect(getByTestId('secure').textContent).toBe('false');
  });

  test('returns default when permission not yet requested', () => {
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    });
    const { getByTestId } = render(<TestConsumer />);
    expect(getByTestId('permission').textContent).toBe('default');
    expect(getByTestId('supported').textContent).toBe('true');
  });

  test('returns granted when permission already granted', () => {
    vi.stubGlobal('Notification', { permission: 'granted' });
    const { getByTestId } = render(<TestConsumer />);
    expect(getByTestId('permission').textContent).toBe('granted');
  });

  test('returns denied when permission already denied', () => {
    vi.stubGlobal('Notification', { permission: 'denied' });
    const { getByTestId } = render(<TestConsumer />);
    expect(getByTestId('permission').textContent).toBe('denied');
  });

  test('requestPermission updates state to granted when user grants', async () => {
    const user = userEvent.setup();
    const requestPermission = vi.fn().mockResolvedValue('granted' as const);
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission,
    });
    const { getByTestId } = render(<TestConsumer />);
    expect(getByTestId('permission').textContent).toBe('default');

    await user.click(getByTestId('request'));
    await waitFor(() => {
      expect(getByTestId('permission').textContent).toBe('granted');
    });
    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  test('requestPermission updates state to denied when user denies', async () => {
    const user = userEvent.setup();
    const requestPermission = vi.fn().mockResolvedValue('denied' as const);
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission,
    });
    const { getByTestId } = render(<TestConsumer />);

    await user.click(getByTestId('request'));
    await waitFor(() => {
      expect(getByTestId('permission').textContent).toBe('denied');
    });
  });

  test('requestPermission returns unsupported when API not available', async () => {
    vi.stubGlobal('Notification', undefined);
    let result: NotificationPermissionState = 'default';
    function Consumer(): React.ReactElement {
      const { requestPermission } = useNotificationPermission();
      return (
        <button
          data-testid="req"
          onClick={async () => {
            result = await requestPermission();
          }}
          type="button"
        >
          Request
        </button>
      );
    }
    const user = userEvent.setup();
    const { getByTestId } = render(<Consumer />);
    await user.click(getByTestId('req'));
    await waitFor(() => {
      expect(result).toBe('unsupported');
    });
  });
});
