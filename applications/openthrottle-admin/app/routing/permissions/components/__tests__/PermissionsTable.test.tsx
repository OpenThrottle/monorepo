import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PermissionsTable } from '../PermissionsTable';
import type { PermissionsTableProps } from '../PermissionsTable';

const mockPermissions: PermissionsTableProps['permissions'] = [
  {
    __typename: 'PermissionObject',
    description: 'Read users',
    id: 'perm-1',
    name: 'users:read',
  },
  {
    __typename: 'PermissionObject',
    description: null,
    id: 'perm-2',
    name: 'users:write',
  },
];

describe('PermissionsTable Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    const Component = () => <PermissionsTable permissions={mockPermissions} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders the table container with its data-testid', () => {
    expect(component.getByTestId('PermissionsTable')).toBeInTheDocument();
  });

  test('renders each permission name as a link to /roles', () => {
    const link = component.getByRole('link', {
      name: /view roles with permission: users:read/i,
    });

    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/roles');
  });

  test('renders an em dash when a permission has no description', () => {
    expect(component.getByText('—')).toBeInTheDocument();
  });

  test('renders permission ids', () => {
    expect(component.getByText('perm-1')).toBeInTheDocument();
    expect(component.getByText('perm-2')).toBeInTheDocument();
  });
});
