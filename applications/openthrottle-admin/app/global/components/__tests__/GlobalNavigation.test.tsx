import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { Sidebar, SidebarProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalNavigation } from '../GlobalNavigation';
import type { GlobalNavigationProps } from '../GlobalNavigation';
import { dataNavigation } from '~/global/data/data.navigation';

describe('GlobalNavigation Component', () => {
  let component: RenderResult;
  let props: GlobalNavigationProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <SidebarProvider>
        <Sidebar>
          <GlobalNavigation {...props} />
        </Sidebar>
      </SidebarProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  describe('navigation links', () => {
    test('should render a link for each nav item with correct label and href', () => {
      for (const item of dataNavigation) {
        const label = typeof item.children === 'string' ? item.children : '';
        const href =
          typeof item.to === 'string' ? item.to : (item.to.pathname ?? '/');
        const link = component.getByRole('link', {
          name: new RegExp(label, 'i'),
        });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', href);
      }
    });

    test('should have clickable link for Dashboard with correct href', () => {
      const dashboardLink = component.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
      expect(dashboardLink).toBeVisible();
    });
  });
});
