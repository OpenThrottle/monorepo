import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarProvider } from '../SidebarProvider';
import { SidebarTrigger } from '../SidebarTrigger';
import type { SidebarTriggerProps } from '../SidebarTrigger';

describe('SidebarTrigger Component', () => {
  let component: RenderResult;
  let props: SidebarTriggerProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <SidebarProvider>
        <SidebarTrigger {...props} />
      </SidebarProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders sidebar toggle button', () => {
    expect(
      component.getByRole('button', { name: /toggle sidebar/i }),
    ).toBeInTheDocument();
  });
});
