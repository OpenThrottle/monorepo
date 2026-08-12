import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub, useFetcher } from 'react-router';
import { describe, expect, test } from 'vitest';
import { UserRolesCard } from '../UserRolesCard';
import type { UserRolesCardProps } from '../UserRolesCard';
import type { action as userDetailAction } from '~/routes/users.$userId';

const renderCard = (
  props: Pick<UserRolesCardProps, 'availableRoles' | 'rolesForUser'>,
): RenderResult => {
  const Harness = () => {
    const fetcher = useFetcher<typeof userDetailAction>();
    return (
      <UserRolesCard
        availableRoles={props.availableRoles}
        fetcher={fetcher}
        rolesForUser={props.rolesForUser}
      />
    );
  };

  const RoutesStub = createRoutesStub([{ Component: Harness, path: '/' }]);

  return render(<RoutesStub />);
};

describe('UserRolesCard Component', () => {
  test('shows the empty state when the user has no roles', () => {
    const component = renderCard({ availableRoles: [], rolesForUser: [] });

    expect(
      component.getByText('No roles assigned. Assign one above.'),
    ).toBeInTheDocument();
  });

  test('links each assigned role to its detail page and offers a remove action', () => {
    const component = renderCard({
      availableRoles: [],
      rolesForUser: [{ id: 'role-1', name: 'admin' }],
    });

    const link = component.getByRole('link', { name: 'admin' });
    expect(link).toHaveAttribute('href', '/roles/role-1');
    expect(
      component.getByRole('button', { name: 'Remove role admin' }),
    ).toBeInTheDocument();
  });

  test('renders the assign-role form when roles are available to assign', () => {
    const withAvailable = renderCard({
      availableRoles: [{ id: 'role-2', name: 'editor' }],
      rolesForUser: [],
    });
    expect(withAvailable.getByText('Assign role…')).toBeInTheDocument();
  });

  test('hides the assign-role form when no roles are available to assign', () => {
    const withoutAvailable = renderCard({
      availableRoles: [],
      rolesForUser: [],
    });
    expect(
      withoutAvailable.queryByText('Assign role…'),
    ).not.toBeInTheDocument();
  });
});
