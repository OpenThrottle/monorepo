import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub, useFetcher } from 'react-router';
import { describe, expect, test } from 'vitest';
import { RolePermissionsCard } from '../RolePermissionsCard';
import type { RolePermissionsCardProps } from '../RolePermissionsCard';
import type { action as roleDetailAction } from '~/routes/roles.$roleId';

const renderCard = (
  props: Pick<RolePermissionsCardProps, 'availablePermissions' | 'permissions'>,
): RenderResult => {
  const Harness = () => {
    const fetcher = useFetcher<typeof roleDetailAction>();
    return (
      <RolePermissionsCard
        availablePermissions={props.availablePermissions}
        fetcher={fetcher}
        permissions={props.permissions}
      />
    );
  };

  const RoutesStub = createRoutesStub([{ Component: Harness, path: '/' }]);

  return render(<RoutesStub />);
};

describe('RolePermissionsCard Component', () => {
  test('shows the None empty state when the role has no permissions', () => {
    const component = renderCard({ availablePermissions: [], permissions: [] });

    expect(
      component.getByText('No permissions assigned. Add one above.'),
    ).toBeInTheDocument();
  });

  test('renders a badge and remove action per assigned permission', () => {
    const component = renderCard({
      availablePermissions: [],
      permissions: [
        {
          __typename: 'PermissionObject',
          createdAt: new Date(2025, 0, 1),
          id: 'p1',
          name: 'users:read',
        },
      ],
    });

    expect(component.getByText('users:read')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Remove users:read' }),
    ).toBeInTheDocument();
  });

  test('renders the add-permission form when permissions are available to add', () => {
    const withAvailable = renderCard({
      availablePermissions: [{ id: 'p2', name: 'users:write' }],
      permissions: [],
    });
    expect(withAvailable.getByText('Add permission…')).toBeInTheDocument();
  });

  test('hides the add-permission form when no permissions are available to add', () => {
    const withoutAvailable = renderCard({
      availablePermissions: [],
      permissions: [],
    });
    expect(
      withoutAvailable.queryByText('Add permission…'),
    ).not.toBeInTheDocument();
  });
});
