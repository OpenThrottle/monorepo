import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { RolesTable } from '../RolesTable';
import type { RolesTableProps } from '../RolesTable';

const mockRoles: RolesTableProps['roles'] = [
  {
    __typename: 'RoleObject',
    createdAt: new Date('2025-01-01'),
    description: 'Administrator',
    id: 'role-1',
    name: 'admin',
    permissions: [
      { __typename: 'PermissionObject', id: 'p1', name: 'users:read' },
    ],
    updatedAt: new Date('2025-01-02'),
  },
];

describe('RolesTable Component', () => {
  let component: RenderResult;
  let props: RolesTableProps;

  beforeEach(() => {
    props = { roles: mockRoles };

    const Component = () => <RolesTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  describe('role name link', () => {
    test('should render link with correct href for role detail', () => {
      const link = component.getByRole('link', {
        name: /view role: admin/i,
      });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/roles/role-1');
    });

    test('should be visible and have correct href', () => {
      const link = component.getByRole('link', {
        name: /view role: admin/i,
      });
      expect(link).toBeVisible();
      expect(link).toHaveAttribute('href', '/roles/role-1');
    });
  });

  describe('View button', () => {
    test('should render View link with correct href', () => {
      const viewLinks = component.getAllByRole('link', { name: /view/i });
      const viewToRole = viewLinks.find(
        (el) => el.getAttribute('href') === '/roles/role-1',
      );
      expect(viewToRole).toBeDefined();
      expect(viewToRole).toBeInTheDocument();
    });
  });

  describe('when role has no permissions', () => {
    beforeEach(() => {
      props = {
        roles: [
          {
            __typename: 'RoleObject',
            createdAt: new Date('2025-01-01'),
            description: 'View only',
            id: 'role-empty',
            name: 'viewer',
            permissions: [],
            updatedAt: new Date('2025-01-01'),
          },
        ],
      };
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Component = () => <RolesTable {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component.rerender(<RoutesStub />);
    });

    test('should show None in permissions cell', () => {
      expect(component.getByText('None')).toBeInTheDocument();
    });
  });

  describe('when role has more than three permissions', () => {
    beforeEach(() => {
      props = {
        roles: [
          {
            __typename: 'RoleObject',
            createdAt: new Date('2025-01-01'),
            description: 'Many perms',
            id: 'role-many',
            name: 'super',
            permissions: [
              { __typename: 'PermissionObject', id: 'p1', name: 'a' },
              { __typename: 'PermissionObject', id: 'p2', name: 'b' },
              { __typename: 'PermissionObject', id: 'p3', name: 'c' },
              { __typename: 'PermissionObject', id: 'p4', name: 'd' },
            ],
            updatedAt: new Date('2025-01-02'),
          },
        ],
      };
      // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
      const Component = () => <RolesTable {...props} />;
      const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
      component.rerender(<RoutesStub />);
    });

    test('should show first three badges and +N overflow', () => {
      expect(component.getByText('a')).toBeInTheDocument();
      expect(component.getByText('b')).toBeInTheDocument();
      expect(component.getByText('c')).toBeInTheDocument();
      expect(component.getByText('+1')).toBeInTheDocument();
    });
  });
});
