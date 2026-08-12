import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { MailToolbarActions } from '../MailToolbarActions';
import type { MailToolbarActionsProps } from '../MailToolbarActions';

describe('MailToolbarActions Component', () => {
  let component: RenderResult;
  let props: MailToolbarActionsProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <TooltipProvider>
        <MailToolbarActions {...props} />
      </TooltipProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders a Compose link to /mail/compose', () => {
    const compose = component.getByRole('link', { name: /compose/i });
    expect(compose).toBeInTheDocument();
    expect(compose).toHaveAttribute('href', '/mail/compose');
  });

  test('renders disabled Refresh, Archive, and Delete placeholders', () => {
    expect(component.getByRole('button', { name: 'Refresh' })).toBeDisabled();
    expect(component.getByRole('button', { name: 'Archive' })).toBeDisabled();
    expect(component.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });

  test('opens the Help popover with quick tips content', async () => {
    const user = userEvent.setup();
    const help = component.getByTestId('MailToolbar-help');
    expect(help).toBeInTheDocument();
    expect(help).toHaveAttribute('aria-label', 'Help');

    await user.click(help);

    expect(component.getByText('Quick tips')).toBeInTheDocument();
    expect(
      component.getByText('Use search to find messages'),
    ).toBeInTheDocument();
  });
});
