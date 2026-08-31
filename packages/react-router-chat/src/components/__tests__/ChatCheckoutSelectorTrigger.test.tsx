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

/**
 * As in `ChatCheckoutSelector.test.tsx`: jsdom has no layout engine, so nothing
 * below proves the branch stays inside `max-w-56`. These assert the markup
 * contract — shortened text, full value on `title`, cap and shrink classes
 * present — and the geometry is verified live in the developer app.
 */
const LONG_BRANCH = 'visormatt/bootstrap-service-accounts';

describe('ChatCheckoutSelectorTrigger Component — branch containment contract', () => {
  test('shortens a long branch and keeps the full value on title', () => {
    const component = renderTrigger({ branch: LONG_BRANCH });

    const branch = component.getByTestId('ChatCheckoutSelector-branch');
    expect(branch).toHaveAttribute('title', LONG_BRANCH);
    expect(branch).not.toHaveTextContent(LONG_BRANCH);
    expect(branch).toHaveTextContent('…');
    expect(branch.textContent).toContain('accounts');
  });

  test('leaves a short branch alone rather than crushing it', () => {
    const component = renderTrigger({ branch: 'main' });

    const branch = component.getByTestId('ChatCheckoutSelector-branch');
    expect(branch).toHaveTextContent('main');
    expect(branch.querySelector('span')?.textContent).toBe('main');
  });

  test('shortens harder than the row, because the face is narrower', () => {
    const component = renderTrigger({ branch: LONG_BRANCH });

    const text = component.getByTestId(
      'ChatCheckoutSelector-branch',
    ).textContent;
    expect(text).not.toBeNull();
    expect(text?.length).toBeLessThanOrEqual(13);
  });

  test('carries the shrink budget and cap that keep the button contained', () => {
    const component = renderTrigger({ branch: LONG_BRANCH });

    const branch = component.getByTestId('ChatCheckoutSelector-branch');
    expect(branch.className).toContain('min-w-0');
    // The cap is what fixes the overflow. `shrink-0` is kept on purpose so a
    // short branch such as `main` is never crushed to `m…` — see the component's
    // contract note on why the trigger inverts the row's shrink priority.
    expect(branch.className).toContain('max-w-32');
    expect(branch.className).toContain('shrink-0');
    // The 2–3 character +N badge is uncapped and must always render in full.
    expect(
      component.getByTestId('ChatCheckoutSelector-overflow').className,
    ).toContain('shrink-0');
  });

  test('renders a short branch verbatim with no ellipsis', () => {
    const component = renderTrigger({ branch: 'main' });

    const branch = component.getByTestId('ChatCheckoutSelector-branch');
    expect(branch).toHaveTextContent('main');
    expect(branch).not.toHaveTextContent('…');
    expect(branch).toHaveAttribute('title', 'main');
  });

  test('renders no branch element for an empty branch string', () => {
    const component = renderTrigger({ branch: '' });

    expect(
      component.queryByTestId('ChatCheckoutSelector-branch'),
    ).not.toBeInTheDocument();
  });

  test('renders no branch element in minimal mode even with a long branch', () => {
    const component = renderTrigger({ branch: LONG_BRANCH, minimal: true });

    const trigger = component.getByTestId('ChatCheckoutSelector-trigger');
    expect(trigger).toHaveAttribute(
      'aria-label',
      'Checkout: openthrottle/monorepo',
    );
    expect(
      component.queryByTestId('ChatCheckoutSelector-branch'),
    ).not.toBeInTheDocument();
  });
});
