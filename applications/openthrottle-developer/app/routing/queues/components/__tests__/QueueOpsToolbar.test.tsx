import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub, useSearchParams } from 'react-router';
import { describe, expect, test } from 'vitest';
import { QueueOpsToolbar } from '../QueueOpsToolbar';
import type { QueueOpsToolbarProps } from '../QueueOpsToolbar';

const renderToolbar = (props: QueueOpsToolbarProps): RenderResult => {
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
  return render(<RoutesStub />);
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

  test('submitting the search writes the q search param', async () => {
    const user = userEvent.setup();
    const component = renderToolbar({});

    await user.type(
      component.getByRole('searchbox', { name: 'Search queues' }),
      'plans',
    );
    await user.click(component.getByRole('button', { name: 'Search' }));

    await waitFor(() => {
      expect(component.getByTestId('echo')).toHaveTextContent('q=plans');
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
