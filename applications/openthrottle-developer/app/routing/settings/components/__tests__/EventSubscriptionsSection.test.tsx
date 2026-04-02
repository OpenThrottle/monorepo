import * as React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { EventSubscriptionsSection } from '../EventSubscriptionsSection';
import { buildInitialSubscriptions } from '~/routing/settings/config/event-subscriptions';
import { EVENT_SUBSCRIPTION_ROWS } from '~/routing/settings/config/event-subscriptions';
import { EVENT_SUBSCRIPTIONS_STORAGE_KEY } from '~/routing/settings/config/event-subscriptions-storage';

describe('EventSubscriptionsSection', () => {
  let component: RenderResult;

  beforeEach(() => {
    window.localStorage.removeItem(EVENT_SUBSCRIPTIONS_STORAGE_KEY);
    const Component = () => <EventSubscriptionsSection />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('should render subscription rows from stub config', () => {
    for (const row of EVENT_SUBSCRIPTION_ROWS) {
      expect(
        component.getByTestId(`event-subscription-${row.id}`),
      ).toBeInTheDocument();
    }
  });

  test('should toggle a switch when clicked', async () => {
    const user = userEvent.setup();
    const first = EVENT_SUBSCRIPTION_ROWS[0];
    const switchEl = component.getByRole('switch', {
      name: `Subscribe to ${first.label}`,
    });
    const expectedInitial = first.defaultSubscribed ? 'checked' : 'unchecked';
    const expectedAfter = first.defaultSubscribed ? 'unchecked' : 'checked';

    expect(switchEl).toHaveAttribute('data-state', expectedInitial);

    await user.click(switchEl);

    expect(switchEl).toHaveAttribute('data-state', expectedAfter);

    const raw = window.localStorage.getItem(EVENT_SUBSCRIPTIONS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toMatchObject({
      [first.id]: !first.defaultSubscribed,
    });
  });

  test('hydrates switch state from localStorage on mount', () => {
    component.unmount();
    const first = EVENT_SUBSCRIPTION_ROWS[0];
    const stored = buildInitialSubscriptions();
    stored[first.id] = !first.defaultSubscribed;
    window.localStorage.setItem(
      EVENT_SUBSCRIPTIONS_STORAGE_KEY,
      JSON.stringify(stored),
    );
    const Component = () => <EventSubscriptionsSection />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
    const switchEl = component.getByRole('switch', {
      name: `Subscribe to ${first.label}`,
    });
    const expectedFromStorage = first.defaultSubscribed
      ? 'unchecked'
      : 'checked';
    expect(switchEl).toHaveAttribute('data-state', expectedFromStorage);
  });

  test('updates switches when storage event fires from another tab', async () => {
    const first = EVENT_SUBSCRIPTION_ROWS[0];
    const switchEl = component.getByRole('switch', {
      name: `Subscribe to ${first.label}`,
    });
    const initialState = first.defaultSubscribed ? 'checked' : 'unchecked';
    expect(switchEl).toHaveAttribute('data-state', initialState);

    const next = {
      ...buildInitialSubscriptions(),
      [first.id]: !first.defaultSubscribed,
    };
    window.localStorage.setItem(
      EVENT_SUBSCRIPTIONS_STORAGE_KEY,
      JSON.stringify(next),
    );
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: EVENT_SUBSCRIPTIONS_STORAGE_KEY,
          newValue: JSON.stringify(next),
          oldValue: null,
          storageArea: localStorage,
        }),
      );
    });

    const expectedAfter = first.defaultSubscribed ? 'unchecked' : 'checked';
    await waitFor(() => {
      expect(switchEl).toHaveAttribute('data-state', expectedAfter);
    });
  });
});
