import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test } from 'vitest';
import { PlanToolbarEditorLinks } from '../PlanToolbarEditorLinks';
import type { PlanToolbarEditorLinksProps } from '../PlanToolbarEditorLinks';
import { WorkspaceEditorId } from '~/__generated__/graphql';

const renderLinks = (props: PlanToolbarEditorLinksProps) => {
  // PlanEditorActions renders tooltips, so it needs the provider.
  const Component = () => (
    <TooltipProvider>
      <PlanToolbarEditorLinks {...props} />
    </TooltipProvider>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('PlanToolbarEditorLinks Component', () => {
  test('renders the editor actions once the deferred editors resolve', async () => {
    const component = renderLinks({
      editors: Promise.resolve([WorkspaceEditorId.Claude]),
      planId: 'plan-1',
      workingDirectory: '/Users/me/repo',
    });

    expect(
      await component.findByTestId('PlanEditorActions'),
    ).toBeInTheDocument();
  });

  // Deep links are a convenience; the toolbar around them must not wait on this.
  test('renders nothing when no editors promise is supplied', () => {
    const component = renderLinks({
      planId: 'plan-1',
      workingDirectory: '/Users/me/repo',
    });

    expect(
      component.queryByTestId('PlanEditorActions'),
    ).not.toBeInTheDocument();
  });

  test('degrades to its own error text when the promise rejects', async () => {
    const component = renderLinks({
      editors: Promise.reject(new Error('settings unavailable')),
      planId: 'plan-1',
      workingDirectory: '/Users/me/repo',
    });

    await waitFor(() =>
      expect(
        component.getByText('Could not load your editor deep links.'),
      ).toBeInTheDocument(),
    );
  });
});
