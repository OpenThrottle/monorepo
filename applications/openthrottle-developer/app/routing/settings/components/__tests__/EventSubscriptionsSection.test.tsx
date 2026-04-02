import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { EventSubscriptionsSection } from '../EventSubscriptionsSection';
import { EVENT_SUBSCRIPTION_ROWS } from '~/routing/settings/config/event-subscriptions';

describe('EventSubscriptionsSection', () => {
  let component: RenderResult;

  beforeEach(() => {
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
  });
});
