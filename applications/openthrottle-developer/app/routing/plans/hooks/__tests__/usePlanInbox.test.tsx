import { act, render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import type { PlanInboxMessageFragment } from '~/__generated__/graphql';

import { usePlanInbox } from '../usePlanInbox';

// Controllable fake graphql-ws client: capture the subscription sink so the test
// can push planMessageChanged events through the real useSubscription.
const shared = vi.hoisted(() => {
  const sinks: Array<{ next: (m: unknown) => void }> = [];
  return {
    client: {
      subscribe: (_payload: unknown, sink: { next: (m: unknown) => void }) => {
        sinks.push(sink);
        return () => undefined;
      },
    },
    sinks,
  };
});

vi.mock('~/services/graphql-ws-client', () => ({
  getGraphqlWsClient: () => shared.client,
}));

const message = (
  overrides: Partial<PlanInboxMessageFragment> & { readonly id: string },
): PlanInboxMessageFragment => {
  return {
    author: 'visormatt',
    body: `body-${overrides.id}`,
    createdAt: '2026-11-03T00:00:00Z',
    deliveredAt: null,
    deliveredToTaskId: null,
    kind: 'STEER',
    planId: 'p1',
    status: 'PENDING',
    taskId: null,
    updatedAt: '2026-11-03T00:00:00Z',
    ...overrides,
  };
};

function Harness(props: {
  readonly seed: readonly PlanInboxMessageFragment[] | undefined;
}): React.ReactElement {
  const { messages } = usePlanInbox({ planId: 'p1', seedMessages: props.seed });
  return (
    <div data-testid="rows">
      {messages.map((m) => `${m.id}:${m.status}`).join(',')}
    </div>
  );
}

const pushChange = (changed: PlanInboxMessageFragment): void => {
  act(() => {
    shared.sinks[shared.sinks.length - 1]?.next({
      data: { planMessageChanged: changed },
    });
  });
};

describe('usePlanInbox', () => {
  test('renders the seed oldest first and leaves out FEEDBACK', () => {
    const component = render(
      <Harness
        seed={[
          message({ createdAt: '2026-11-03T00:00:02Z', id: 'b' }),
          message({
            createdAt: '2026-11-03T00:00:01Z',
            id: 'a',
            kind: 'QUEUE',
          }),
          message({ id: 'f', kind: 'FEEDBACK', status: 'RECORDED' }),
        ]}
      />,
    );

    expect(component.getByTestId('rows').textContent).toBe(
      'a:PENDING,b:PENDING',
    );
  });

  test('accepts live changes before the deferred snapshot resolves', () => {
    const component = render(<Harness seed={undefined} />);

    pushChange(message({ id: 'a' }));

    expect(component.getByTestId('rows').textContent).toBe('a:PENDING');
  });

  test('a delivery event replaces the pending row in place', () => {
    const component = render(<Harness seed={[message({ id: 'a' })]} />);

    pushChange(
      message({
        deliveredAt: '2026-11-03T00:01:00Z',
        id: 'a',
        status: 'DELIVERED',
        updatedAt: '2026-11-03T00:01:00Z',
      }),
    );

    expect(component.getByTestId('rows').textContent).toBe('a:DELIVERED');
  });

  test('an older snapshot never rolls a delivered row back to pending', () => {
    const stale = [message({ id: 'a' })];
    const component = render(<Harness seed={stale} />);

    pushChange(
      message({
        id: 'a',
        status: 'DELIVERED',
        updatedAt: '2026-11-03T00:01:00Z',
      }),
    );
    // Revalidation hands back a snapshot taken before the claim.
    component.rerender(<Harness seed={[message({ id: 'a' })]} />);

    expect(component.getByTestId('rows').textContent).toBe('a:DELIVERED');
  });
});
