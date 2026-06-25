import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { UsersTable } from '../UsersTable';
import type { UsersTableProps } from '../UsersTable';

const mockUsers: UsersTableProps['users'] = [
  {
    __typename: 'UserObject',
    createdAt: new Date('2025-01-01'),
    disabledAt: null,
    email: 'matt@example.com',
    githubUsername: 'visormatt',
    id: 'user-1',
    updatedAt: new Date('2025-01-02'),
  },
  {
    __typename: 'UserObject',
    createdAt: new Date('2025-01-01'),
    disabledAt: new Date('2025-02-01'),
    email: null,
    githubUsername: 'disabledUser',
    id: 'user-2',
    updatedAt: new Date('2025-01-02'),
  },
];

describe('UsersTable Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    const Component = () => <UsersTable users={mockUsers} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders the table container with its data-testid', () => {
    expect(component.getByTestId('UsersTable')).toBeInTheDocument();
  });

  test('renders the GitHub username as a link to the user detail page', () => {
    const link = component.getByRole('link', {
      name: /view user: visormatt/i,
    });

    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/users/user-1');
  });

  test('renders an em dash when the user has no email', () => {
    expect(component.getByText('—')).toBeInTheDocument();
  });

  test('renders Active and Disabled status badges', () => {
    expect(component.getByText('Active')).toBeInTheDocument();
    expect(component.getByText('Disabled')).toBeInTheDocument();
  });

  test('renders a View action link per row', () => {
    const viewLinks = component.getAllByRole('link', { name: /^view$/i });
    const hrefs = viewLinks.map((el) => el.getAttribute('href'));

    expect(hrefs).toContain('/users/user-1');
    expect(hrefs).toContain('/users/user-2');
  });
});
