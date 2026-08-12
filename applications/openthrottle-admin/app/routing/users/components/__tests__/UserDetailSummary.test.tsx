import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { UserDetailSummary } from '../UserDetailSummary';
import type { UserDetailSummaryProps } from '../UserDetailSummary';

// Constructed from local y/m/d components (not an ISO date-only string) so the
// rendered `formatDate` output is stable regardless of the test runner's
// timezone offset.
const user: UserDetailSummaryProps['user'] = {
  __typename: 'UserObject',
  createdAt: new Date(2025, 0, 1),
  disabledAt: null,
  email: 'matt@example.com',
  githubUsername: 'visormatt',
  id: 'user-1',
  updatedAt: new Date(2025, 0, 5),
};

const renderSummary = (props: UserDetailSummaryProps): RenderResult => {
  const Component = () => <UserDetailSummary {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('UserDetailSummary Component', () => {
  test('renders the email, GitHub username, and Active badge for an enabled user', () => {
    const component = renderSummary({ isDisabled: false, user });

    expect(component.getByText('matt@example.com')).toBeInTheDocument();
    expect(component.getByText('visormatt')).toBeInTheDocument();
    expect(component.getByText('Active')).toBeInTheDocument();
    expect(component.getByText('Jan 1, 2025')).toBeInTheDocument();
    expect(component.getByText('Jan 5, 2025')).toBeInTheDocument();
  });

  test('renders the Disabled badge, disabled-at date, and an em dash for a missing email', () => {
    const disabledUser: UserDetailSummaryProps['user'] = {
      ...user,
      disabledAt: new Date(2025, 1, 1),
      email: null,
    };

    const component = renderSummary({ isDisabled: true, user: disabledUser });

    expect(component.getByText('—')).toBeInTheDocument();
    expect(component.getByText('Disabled')).toBeInTheDocument();
    expect(component.getByText('Feb 1, 2025')).toBeInTheDocument();
  });
});
