import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, useFetcher } from 'react-router';
import { describe, expect, test } from 'vitest';
import { UserStatusActions } from '../UserStatusActions';
import type { action as userDetailAction } from '~/routes/users.$userId';

const renderActions = (isDisabled: boolean): RenderResult => {
  const Harness = () => {
    const fetcher = useFetcher<typeof userDetailAction>();
    return <UserStatusActions fetcher={fetcher} isDisabled={isDisabled} />;
  };

  const RoutesStub = createRoutesStub([{ Component: Harness, path: '/' }]);

  return render(<RoutesStub />);
};

describe('UserStatusActions Component', () => {
  test('renders an Enable user button when the user is disabled', () => {
    const component = renderActions(true);

    expect(
      component.getByRole('button', { name: 'Enable user' }),
    ).toBeInTheDocument();
    expect(
      component.queryByRole('button', { name: 'Disable user' }),
    ).not.toBeInTheDocument();
  });

  test('opens a confirmation dialog before disabling an active user', async () => {
    const user = userEvent.setup();
    const component = renderActions(false);

    expect(
      component.getByRole('button', { name: 'Disable user' }),
    ).toBeInTheDocument();

    await user.click(component.getByRole('button', { name: 'Disable user' }));

    expect(
      await component.findByRole('heading', { name: 'Disable user' }),
    ).toBeInTheDocument();
    expect(
      component.getByText(/will disable the user account/i),
    ).toBeInTheDocument();
  });
});
