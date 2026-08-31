import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { ChatCheckoutSelectorTrigger } from '../ChatCheckoutSelectorTrigger';
import type { ChatCheckoutSelectorTriggerProps } from '../ChatCheckoutSelectorTrigger';

const renderTrigger = (
  overrides: Partial<ChatCheckoutSelectorTriggerProps> = {},
): RenderResult =>
  render(
    <ChatCheckoutSelectorTrigger
      branch="main"
      enabled={true}
      label="openthrottle/monorepo"
      secondaryCount={2}
      {...overrides}
    />,
  );

describe('ChatCheckoutSelectorTrigger Component', () => {
  test('renders the label, overflow count and branch by default', () => {
    const component = renderTrigger();

    const trigger = component.getByTestId('ChatCheckoutSelector-trigger');
    expect(trigger).toHaveTextContent('openthrottle/monorepo');
    expect(trigger).toHaveAttribute('aria-label', 'Checkout');
    expect(
      component.getByTestId('ChatCheckoutSelector-overflow'),
    ).toHaveTextContent('+2');
    expect(
      component.getByTestId('ChatCheckoutSelector-branch'),
    ).toHaveTextContent('main');
  });

  test('renders icon-only in minimal mode', () => {
    const component = renderTrigger({ minimal: true });

    const trigger = component.getByTestId('ChatCheckoutSelector-trigger');
    expect(trigger).not.toHaveTextContent('openthrottle/monorepo');
    expect(
      component.queryByTestId('ChatCheckoutSelector-overflow'),
    ).not.toBeInTheDocument();
    expect(
      component.queryByTestId('ChatCheckoutSelector-branch'),
    ).not.toBeInTheDocument();
  });

  test('keeps the resolved label in the accessible name when minimal', () => {
    const component = renderTrigger({ minimal: true });

    expect(
      component.getByRole('button', {
        name: 'Checkout: openthrottle/monorepo',
      }),
    ).toBeInTheDocument();
  });

  test('forwards its ref and spreads the remaining props', () => {
    const ref = React.createRef<HTMLButtonElement>();
    const component = render(
      <ChatCheckoutSelectorTrigger
        data-state="open"
        enabled={true}
        label="openthrottle"
        minimal={true}
        ref={ref}
        secondaryCount={0}
      />,
    );

    expect(ref.current).toBe(
      component.getByTestId('ChatCheckoutSelector-trigger'),
    );
    expect(
      component.getByTestId('ChatCheckoutSelector-trigger'),
    ).toHaveAttribute('data-state', 'open');
  });

  test('stays disabled when nothing is selectable', () => {
    const component = renderTrigger({ enabled: false, minimal: true });

    expect(
      component.getByTestId('ChatCheckoutSelector-trigger'),
    ).toBeDisabled();
  });
});
