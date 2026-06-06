import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarProvider } from '../SidebarProvider';
import type { SidebarProviderProps } from '../SidebarProvider';

describe('SidebarProvider Component', () => {
  let component: RenderResult;
  let props: SidebarProviderProps;

  beforeEach(() => {
    props = { children: <span>Sidebar child</span> };

    const Component = () => <SidebarProvider {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders sidebar provider wrapper', () => {
    expect(
      component.container.querySelector('[data-slot="sidebar-wrapper"]'),
    ).toBeInTheDocument();
  });
});
