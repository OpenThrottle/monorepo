import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarProvider } from '../SidebarProvider';
import { useSidebar } from '../useSidebar';

describe('useSidebar', () => {
  let component: RenderResult;

  beforeEach(() => {
    const Component = () => {
      const { state } = useSidebar();
      return <span data-testid="sidebar-state">{state}</span>;
    };
    const RoutesStub = createRoutesStub([
      {
        Component: () => (
          <SidebarProvider>
            <Component />
          </SidebarProvider>
        ),
        path: '/',
      },
    ]);

    component = render(<RoutesStub />);
  });

  test('should return sidebar context within SidebarProvider', () => {
    expect(component.getByTestId('sidebar-state')).toHaveTextContent(
      'expanded',
    );
  });
});
