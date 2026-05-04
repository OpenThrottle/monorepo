import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalSidebar } from '../GlobalSidebar';
import type { GlobalSidebarProps } from '../GlobalSidebar';

const StubIcon = (iconProps: { className?: string }) => (
  <span className={iconProps.className} data-testid="sidebar-stub-icon" />
);

describe('GlobalSidebar Component', () => {
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

    const Component = () => <GlobalSidebar {...props} />;
    const RoutesStub = createRoutesStub([
      { Component, path: '/' },
      { Component: () => <div>Dashboard page</div>, path: '/dashboard' },
    ]);

    render(<RoutesStub />);
  });

  test('should render navigation link and icon for section data', () => {
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/dashboard');
    expect(screen.getByTestId('sidebar-stub-icon')).toBeInTheDocument();
  });

  test('should navigate when link is activated', async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole('link'));
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
  });
});
