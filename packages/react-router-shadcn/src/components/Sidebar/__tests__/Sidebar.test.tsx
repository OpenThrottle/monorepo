import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { SidebarProps } from '../Sidebar';
import { Sidebar } from '../Sidebar';
import { SidebarProvider } from '../SidebarProvider';

describe('Sidebar Component', () => {
  let component: RenderResult;
  let props: SidebarProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <SidebarProvider>
        <Sidebar {...props} />
      </SidebarProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders sidebar root', () => {
    expect(
      component.container.querySelector('[data-slot="sidebar"]'),
    ).toBeInTheDocument();
  });
});
