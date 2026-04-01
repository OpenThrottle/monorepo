import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { SidebarProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { MailSidebar } from '../MailSidebar';
import type { MailSidebarProps } from '../MailSidebar';

describe('MailSidebar Component', () => {
  let component: RenderResult;
  let props: MailSidebarProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <SidebarProvider>
        <MailSidebar {...props} />
      </SidebarProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render with nav links and support collapsible icon mode', () => {
    const sidebars = component.getAllByTestId('MailSidebar');
    expect(sidebars.length).toBeGreaterThanOrEqual(1);
    const sidebar = sidebars[0];
    expect(sidebar).toHaveAttribute('data-state', 'expanded');
    expect(component.getByRole('link', { name: /inbox/i })).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: /compose/i }),
    ).toBeInTheDocument();
  });
});
