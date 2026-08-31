import * as React from 'react';
import type { RenderResult } from '@testing-library/react';
import { Tabs, TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test, vi } from 'vitest';
import { PlanDetailTabsList } from '../PlanDetailTabsList';
import type { PlanDetailTabsListProps } from '../PlanDetailTabsList';
import { renderRoutesStub } from '~/testing/route-fixtures';

const renderTabs = (
  overrides: Partial<PlanDetailTabsListProps> = {},
): RenderResult =>
  renderRoutesStub(
    <TooltipProvider>
      <Tabs defaultValue="overview">
        <PlanDetailTabsList
          checkoutId=""
          editorWorkingDirectory=""
          editors={Promise.resolve([])}
          onCheckoutChange={vi.fn()}
          planId="plan-1"
          repositories={Promise.resolve([])}
          resolvedTaskCount={2}
          showConfiguration={false}
          taskCount={5}
          {...overrides}
        />
      </Tabs>
    </TooltipProvider>,
  );

describe('PlanDetailTabsList Component', () => {
  test('renders the three always-on tabs with the resolved-task count', () => {
    const component = renderTabs();

    expect(
      component.getByRole('tab', { name: /details/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('tab', { name: /tasks \(2\/5\)/i }),
    ).toBeInTheDocument();
    expect(component.getByRole('tab', { name: /output/i })).toBeInTheDocument();
  });

  test('keeps the Configuration tab gated off by default', () => {
    const component = renderTabs();

    expect(
      component.queryByRole('tab', { name: /configuration/i }),
    ).not.toBeInTheDocument();
  });

  test('shows the Configuration tab when it is turned on', () => {
    const component = renderTabs({ showConfiguration: true });

    expect(
      component.getByRole('tab', { name: /configuration/i }),
    ).toBeInTheDocument();
  });

  test('mounts the checkout picker in the row', async () => {
    const component = renderTabs();

    expect(
      await component.findByTestId('PlanCheckoutSelector'),
    ).toBeInTheDocument();
  });

  test('renders the picker icon-only so it does not crowd the row', async () => {
    const component = renderTabs();

    await component.findByTestId('PlanCheckoutSelector');

    const trigger = component.getByTestId('ChatCheckoutSelector-trigger');
    expect(trigger).toHaveTextContent('');
    expect(trigger).toHaveAccessibleName(/^Checkout: /);
    expect(
      component.queryByTestId('ChatCheckoutSelector-branch'),
    ).not.toBeInTheDocument();
  });
});
