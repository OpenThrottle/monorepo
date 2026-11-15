import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { GlobalProviders } from '../GlobalProviders';
import type { GlobalSidebarProps } from '../GlobalSidebar';
import { GlobalSidebar } from '../GlobalSidebar';

const StubIcon = (iconProps: { className?: string }) => {
  return (
    <span className={iconProps.className} data-testid="sidebar-stub-icon" />
  );
};

describe('GlobalSidebar Component', () => {
  let component: RenderResult;
  let props: GlobalSidebarProps;

  beforeEach(() => {
    props = {
      data: {
        Main: [
          {
            children: 'Dashboard',
            icon: StubIcon,
            to: '/dashboard',
          },
        ],
      },
    };

    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => {
      return (
        <GlobalProviders>
          <GlobalSidebar {...props} />
        </GlobalProviders>
      );
    };
    const RoutesStub = createRoutesStub([
      { Component, path: '/' },
      // eslint-disable-next-line react/no-multi-comp -- test-local mock component
      { Component: () => <div>Dashboard page</div>, path: '/dashboard' },
    ]);

    component = render(<RoutesStub />);
  });

  test('should render navigation link and icon for section data', () => {
    const link = component.getByRole('link');
    expect(link).toHaveAttribute('href', '/dashboard');
    expect(component.getByTestId('sidebar-stub-icon')).toBeInTheDocument();
  });

  test('should navigate when link is activated', async () => {
    const user = userEvent.setup();
    await user.click(component.getByRole('link'));
    expect(await component.findByText('Dashboard page')).toBeInTheDocument();
  });
});
