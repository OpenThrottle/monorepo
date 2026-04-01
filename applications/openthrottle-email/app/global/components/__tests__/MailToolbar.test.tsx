import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import {
  SidebarProvider,
  TooltipProvider,
} from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { MailToolbar } from '../MailToolbar';
import type { MailToolbarProps } from '../MailToolbar';

describe('MailToolbar Component', () => {
  let component: RenderResult;
  let props: MailToolbarProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <TooltipProvider>
        <SidebarProvider>
          <MailToolbar {...props} />
        </SidebarProvider>
      </TooltipProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should have data-testid MailToolbar and role toolbar', () => {
    const toolbar = component.getByTestId('MailToolbar');
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).toHaveAttribute('role', 'toolbar');
  });

  test('should render search section with labeled input', () => {
    const search = component.getByRole('search');
    expect(search).toBeInTheDocument();
    const input = component.getByRole('searchbox', { name: /search mail/i });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Search mail');
  });

  test('should render breadcrumb navigation with Mail and Inbox', () => {
    const toolbar = component.getByTestId('MailToolbar');
    const navs = component.getAllByRole('navigation', { name: /breadcrumb/i });
    expect(navs.length).toBeGreaterThanOrEqual(1);
    expect(navs[0]).toContainElement(
      component.getByRole('link', { name: /^mail$/i }),
    );
    expect(toolbar).toHaveTextContent('Inbox');
  });

  test('should render Compose link to /mail/compose', () => {
    const compose = component.getByRole('link', { name: /compose/i });
    expect(compose).toBeInTheDocument();
    expect(compose).toHaveAttribute('href', '/mail/compose');
  });

  test('should render action buttons with accessible labels', () => {
    expect(
      component.getByRole('button', { name: /refresh/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /archive/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /delete/i }),
    ).toBeInTheDocument();
  });

  test('should render sidebar trigger for collapsible navigation', () => {
    const trigger = component.getByTestId('MailToolbar-sidebarTrigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-label', 'Toggle sidebar');
  });
});
