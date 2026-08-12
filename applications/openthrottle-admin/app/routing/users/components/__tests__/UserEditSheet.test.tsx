import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, useFetcher } from 'react-router';
import { describe, expect, test } from 'vitest';
import { UserEditSheet } from '../UserEditSheet';
import type { UserEditSheetProps } from '../UserEditSheet';
import type { action as userDetailAction } from '~/routes/users.$userId';

const user: UserEditSheetProps['user'] = {
  __typename: 'UserObject',
  createdAt: new Date('2025-01-01'),
  disabledAt: null,
  email: 'matt@example.com',
  githubUsername: 'visormatt',
  id: 'user-1',
  updatedAt: new Date('2025-01-02'),
};

const renderSheet = (): RenderResult => {
  const Harness = () => {
    const fetcher = useFetcher<typeof userDetailAction>();
    const [open, setOpen] = React.useState(false);

    return (
      <UserEditSheet
        fetcher={fetcher}
        onOpenChange={setOpen}
        open={open}
        user={user}
      />
    );
  };

  const RoutesStub = createRoutesStub([{ Component: Harness, path: '/' }]);

  return render(<RoutesStub />);
};

describe('UserEditSheet Component', () => {
  test('opens with the GitHub username and email pre-filled', async () => {
    const eventUser = userEvent.setup();
    const component = renderSheet();

    await eventUser.click(component.getByRole('button', { name: 'Edit user' }));

    expect(await component.findByLabelText('GitHub username')).toHaveValue(
      'visormatt',
    );
    expect(component.getByLabelText('Email (optional)')).toHaveValue(
      'matt@example.com',
    );
  });

  test('closes when Cancel is clicked', async () => {
    const eventUser = userEvent.setup();
    const component = renderSheet();

    await eventUser.click(component.getByRole('button', { name: 'Edit user' }));
    await component.findByLabelText('GitHub username');

    await eventUser.click(component.getByRole('button', { name: 'Cancel' }));

    expect(
      component.queryByLabelText('GitHub username'),
    ).not.toBeInTheDocument();
  });
});
