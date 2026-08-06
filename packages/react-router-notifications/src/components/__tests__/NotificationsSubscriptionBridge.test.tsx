import * as React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { useSubscription } from '@openthrottle/react-router-graphql';
import { NotificationsSubscriptionBridge } from '../NotificationsSubscriptionBridge';
import type { NotificationsSubscriptionData } from '../NotificationsSubscriptionBridge';
import { NotificationsStoreProvider } from '../NotificationsStoreProvider';
import { useNotificationsStore } from '../../hooks/useNotificationsStore';

vi.mock('@openthrottle/react-router-graphql', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openthrottle/react-router-graphql')>();

  return {
    ...actual,
    useSubscription: vi.fn(),
  };
});

interface TestSubscriptionData extends NotificationsSubscriptionData {
  readonly notifications: {
    readonly event: string;
    readonly message: string;
    readonly severity: string;
    readonly timestamp: string;
  };
}

const testDocument: TypedDocumentNode<
  TestSubscriptionData,
  Record<string, never>
> = parse('subscription Notifications { notifications { event } }');

function StoreProbe(): React.ReactElement {
  const { notifications } = useNotificationsStore();

  return (
    <ul data-testid="probe">
      {notifications.map((notification) => (
        <li key={notification.id}>{notification.payload.message}</li>
      ))}
    </ul>
  );
}

const renderBridge = (options: { enabled?: boolean } = {}): void => {
  const { enabled } = options;
  // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
  const Component = (): React.ReactElement => (
    <NotificationsStoreProvider persist={false}>
      <NotificationsSubscriptionBridge
        client={null}
        document={testDocument}
        enabled={enabled}
      >
        <StoreProbe />
      </NotificationsSubscriptionBridge>
    </NotificationsStoreProvider>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  render(<RoutesStub />);
};

describe('NotificationsSubscriptionBridge', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.mocked(useSubscription).mockClear();
  });

  test('subscribes with the injected client and document (enabled by default)', () => {
    renderBridge();

    expect(useSubscription).toHaveBeenCalledWith(
      null,
      testDocument,
      {},
      expect.objectContaining({ onData: expect.any(Function) }),
      true,
    );
  });

  test('forwards enabled=false to gate the subscription while signed out', () => {
    renderBridge({ enabled: false });

    expect(useSubscription).toHaveBeenCalledWith(
      null,
      testDocument,
      {},
      expect.objectContaining({ onData: expect.any(Function) }),
      false,
    );
  });

  test('feeds subscription payloads into the notifications store', async () => {
    renderBridge();

    const [, , , handlers] = vi.mocked(useSubscription).mock.calls[0];

    act(() => {
      handlers.onData({
        notifications: {
          event: 'SYSTEM_ALERT',
          message: 'Realtime message arrived',
          severity: 'info',
          timestamp: new Date().toISOString(),
        },
      });
    });

    await waitFor(() => {
      expect(document.querySelector('[data-testid="probe"]')).toHaveTextContent(
        'Realtime message arrived',
      );
    });
  });
});
