import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useSearchParams } from 'react-router';
import { describe, expect, test } from 'vitest';

import { QUEUE_STATE_FILTER_COPY } from '~/routing/queues/data/data.copy';

import type { QueueOpsToolbarProps } from '../QueueOpsToolbar';
import { QueueOpsToolbar } from '../QueueOpsToolbar';

interface RenderToolbarOptions extends QueueOpsToolbarProps {
  readonly initialEntry?: string;
}

const renderToolbar = (options: RenderToolbarOptions): RenderResult => {
  const { initialEntry = '/', ...props } = options;
  const Harness = () => {
    const [searchParams] = useSearchParams();

    return (
      <>
        <QueueOpsToolbar {...props} />
        <div data-testid="echo">{searchParams.toString()}</div>
      </>
    );
  };

  const RoutesStub = createRoutesStub([{ Component: Harness, path: '/' }]);
  return render(<RoutesStub initialEntries={[initialEntry]} />);
};

describe('QueueOpsToolbar Component', () => {
  test('renders search and refresh, no state filter without options', () => {
    const component = renderToolbar({});

    expect(component.getByTestId('QueueOpsToolbar')).toBeInTheDocument();
    expect(component.getByRole('search')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Refresh' }),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('QueueOpsToolbar-state-filter'),
    ).not.toBeInTheDocument();
  });

  test('renders the state filter when options are provided', () => {
    const component = renderToolbar({ stateOptions: ['active', 'failed'] });

    expect(
      component.getByTestId('QueueOpsToolbar-state-filter'),
    ).toBeInTheDocument();
  });

  describe('state filter', () => {
    test('lists one unchecked option per state when the URL has none', async () => {
      const user = userEvent.setup();
      const component = renderToolbar({ stateOptions: ['active', 'failed'] });

      await user.click(component.getByRole('combobox', { name: 'State' }));

      const options = await component.findAllByRole('option');
      expect(options).toHaveLength(2);
      options.forEach((option) => {
        expect(option).toHaveAttribute('aria-checked', 'false');
      });
    });

    test('selecting a state writes the state param and resets page', async () => {
      const user = userEvent.setup();
      const component = renderToolbar({
        initialEntry: '/?page=3',
        stateOptions: ['active', 'failed'],
      });

      await user.click(component.getByRole('combobox', { name: 'State' }));
      const [, failed] = await component.findAllByRole('option');
      if (!failed) {
        throw new Error('expected a second option');
      }
      await user.click(failed);

      await waitFor(() => {
        expect(component.getByTestId('echo')).toHaveTextContent(
          'page=1&state=failed',
        );
      });
    });

    test('the all-states footer action clears the state param', async () => {
      const user = userEvent.setup();
      const component = renderToolbar({
        initialEntry: '/?state=active&state=failed',
        stateOptions: ['active', 'failed'],
      });

      await user.click(component.getByRole('combobox', { name: 'State' }));
      await user.click(
        await component.findByRole('button', {
          name: QUEUE_STATE_FILTER_COPY.allStates,
        }),
      );

      await waitFor(() => {
        expect(component.getByTestId('echo')).toHaveTextContent('page=1');
      });
      expect(component.getByTestId('echo')).not.toHaveTextContent('state=');
    });
  });

  test('submitting the search writes the search search param', async () => {
    const user = userEvent.setup();
    const component = renderToolbar({});

    await user.type(
      component.getByRole('searchbox', { name: 'Search queues' }),
      'plans',
    );
    await user.click(component.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(component.getByTestId('echo')).toHaveTextContent('search=plans');
    });
  });

  test('renders route-specific actions in the actions slot', () => {
    const component = renderToolbar({
      actions: <button type="button">Create queue</button>,
    });

    expect(
      component.getByRole('button', { name: 'Create queue' }),
    ).toBeInTheDocument();
  });
});
