import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import * as RouteModule from '../dashboard._index';
import { ADMIN_PATHS } from '~/global/data/data.navigation';

describe('routes/dashboard._index.tsx', () => {
  test('exports default component and meta', () => {
    expect(typeof RouteModule.default).toBe('function');
    expect(typeof RouteModule.meta).toBe('function');
  });

  describe('dashboard cards and links', () => {
    test('renders cards with expected data-testid and links use ADMIN_PATHS', () => {
      const RoutesStub = createRoutesStub([
        // createRoutesStub route component typing differs from generated route module types
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any -- stub route component
        { Component: RouteModule.default as any, path: '/' },
      ]);
      const component = render(<RoutesStub />);

      expect(
        component.getByTestId('dashboard-card-permissions'),
      ).toBeInTheDocument();
      expect(component.getByTestId('dashboard-card-roles')).toBeInTheDocument();
      expect(component.getByTestId('dashboard-card-users')).toBeInTheDocument();

      const permissionsLink = component.getByRole('link', {
        name: /permissions/i,
      });
      const rolesLink = component.getByRole('link', { name: /roles/i });
      const usersLink = component.getByRole('link', { name: /users/i });

      expect(permissionsLink).toHaveAttribute('href', ADMIN_PATHS.permissions);
      expect(rolesLink).toHaveAttribute('href', ADMIN_PATHS.roles);
      expect(usersLink).toHaveAttribute('href', ADMIN_PATHS.users);
    });
  });
});
