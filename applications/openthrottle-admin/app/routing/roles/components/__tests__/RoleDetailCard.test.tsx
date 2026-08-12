import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub, useFetcher } from 'react-router';
import { describe, expect, test } from 'vitest';
import { RoleDetailCard } from '../RoleDetailCard';
import type { RoleDetailCardProps } from '../RoleDetailCard';
import type { action as roleDetailAction } from '~/routes/roles.$roleId';

// Constructed from local y/m/d components (not an ISO date-only string) so the
// rendered `formatDate` output is stable regardless of the test runner's
// timezone offset.
const role: RoleDetailCardProps['role'] = {
  __typename: 'RoleObject',
  createdAt: new Date(2025, 0, 1),
  description: 'Administrator',
  id: 'role-1',
  name: 'admin',
  permissions: [],
  updatedAt: new Date(2025, 1, 3),
};

const renderCard = (role: RoleDetailCardProps['role']): RenderResult => {
  const Harness = () => {
    const fetcher = useFetcher<typeof roleDetailAction>();
    return (
      <RoleDetailCard
        editOpen={false}
        fetcher={fetcher}
        onEditOpenChange={() => {}}
        role={role}
      />
    );
  };

  const RoutesStub = createRoutesStub([{ Component: Harness, path: '/' }]);

  return render(<RoutesStub />);
};

describe('RoleDetailCard Component', () => {
  test('renders the role name, description, and formatted updated date', () => {
    const component = renderCard(role);

    expect(component.getByText('admin')).toBeInTheDocument();
    expect(component.getByText('Administrator')).toBeInTheDocument();
    expect(component.getByText('Feb 3, 2025')).toBeInTheDocument();
  });

  test('renders an em dash when the role has no description', () => {
    const component = renderCard({ ...role, description: null });

    expect(component.getByText('—')).toBeInTheDocument();
  });
});
