import type { RenderResult } from '@testing-library/react';
import { cleanup, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useFetcher } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';

import { GlobalPopover } from '../GlobalPopover';

const FETCHER_KEY = 'cancelThing:thing-1';

/**
 * The contract behind `GlobalPopoverAction.fetcherKey`: a call site that holds
 * `useFetcher({ key })` observes both halves of the submission the confirm
 * dialog dispatches — `state` (pending labels) and `data` (result toasts).
 *
 * The dialog unmounts during the confirming click, which is safe: React Router
 * refcounts fetcher keys, so the dialog's unmount takes the count 2 -> 1 and
 * does not purge the payload while the call site still holds the key. What
 * *does* purge it is the call site itself unmounting — see the column-stability
 * guard in the plans table, which is what keeps this subtree alive.
 */
const CallSite = (): React.ReactElement => {
  const fetcher = useFetcher({ key: FETCHER_KEY });
  const data: unknown = fetcher.data;

  return (
    <div>
      <div data-testid="fetcher-state">{fetcher.state}</div>
      <div data-testid="fetcher-data">
        {data == null ? 'no-data' : JSON.stringify(data)}
      </div>
      <GlobalPopover
        actions={[
          {
            confirm: { description: 'Stops the thing.', title: 'Kill?' },
            fetcherKey: FETCHER_KEY,
            fields: { intent: 'cancelThing' },
            id: 'cancelThing',
            kind: 'submit',
            label: 'Kill',
            navigate: false,
          },
        ]}
        ariaLabel="Row actions"
      />
    </div>
  );
};

const renderCallSite = (): RenderResult => {
  const RoutesStub = createRoutesStub([
    {
      Component: CallSite,
      action: () => ({ cancelThing: { outcome: 'RUN_CANCELLED' } }),
      path: '/',
    },
  ]);

  return render(<RoutesStub />);
};

const confirmKill = async (component: RenderResult): Promise<void> => {
  const user = userEvent.setup();

  await user.click(component.getByRole('button', { name: 'Row actions' }));
  await user.click(component.getByRole('menuitem', { name: 'Kill' }));
  await user.click(component.getByRole('button', { name: 'Confirm' }));
};

describe('GlobalPopover fetcherKey observability', () => {
  afterEach(() => {
    cleanup();
  });

  test('delivers the action payload to the call site holding the same key', async () => {
    const component = renderCallSite();

    expect(component.getByTestId('fetcher-data')).toHaveTextContent('no-data');

    await confirmKill(component);

    await waitFor(() => {
      expect(component.getByTestId('fetcher-data')).toHaveTextContent(
        'RUN_CANCELLED',
      );
    });
  });

  test('returns the call site to idle once the submission settles', async () => {
    const component = renderCallSite();

    await confirmKill(component);

    await waitFor(() => {
      expect(component.getByTestId('fetcher-state')).toHaveTextContent('idle');
    });
  });
});
