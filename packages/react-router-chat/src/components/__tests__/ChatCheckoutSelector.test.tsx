import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { ChatCheckoutSelector } from '../ChatCheckoutSelector';
import type { ChatCheckoutSelectorProps } from '../ChatCheckoutSelector';
import type { ChatCheckoutOption } from '../../types';

const CHECKOUTS: readonly ChatCheckoutOption[] = [
  { branch: 'main', id: 'repo-a', label: 'openthrottle' },
  { branch: 'develop', id: 'repo-b', label: 'playground' },
];

const renderSelector = (
  overrides: Partial<ChatCheckoutSelectorProps> = {},
): RenderResult =>
  render(
    <ChatCheckoutSelector
      checkouts={CHECKOUTS}
      onCheckoutChange={vi.fn()}
      selectedCheckoutId="repo-a"
      {...overrides}
    />,
  );

describe('ChatCheckoutSelector Component', () => {
  test('shows the selected checkout label and branch on the trigger', () => {
    const component = renderSelector();

    const trigger = component.getByTestId('ChatCheckoutSelector-trigger');
    expect(trigger).toHaveTextContent('openthrottle');
    expect(
      component.getByTestId('ChatCheckoutSelector-branch'),
    ).toHaveTextContent('main');
  });

  test('lists the available checkouts when opened', async () => {
    const user = userEvent.setup();
    const component = renderSelector();
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));

    expect(
      component.getByTestId('ChatCheckoutSelector-option-repo-a'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('ChatCheckoutSelector-option-repo-b'),
    ).toHaveTextContent('playground');
  });

  test('fires onCheckoutChange with the chosen checkout id', async () => {
    const onCheckoutChange = vi.fn();
    const user = userEvent.setup();
    const component = renderSelector({ onCheckoutChange });
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));
    await user.click(
      component.getByTestId('ChatCheckoutSelector-option-repo-b'),
    );

    expect(onCheckoutChange).toHaveBeenCalledWith('repo-b');
  });

  test('renders a disabled trigger when no checkouts are supplied', () => {
    const component = renderSelector({ checkouts: [] });

    const trigger = component.getByTestId('ChatCheckoutSelector-trigger');
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveTextContent('No checkouts');
  });
});

const CHECKOUTS_THREE: readonly ChatCheckoutOption[] = [
  ...CHECKOUTS,
  { branch: 'main', id: 'repo-c', label: 'showroom' },
];

const renderMulti = (
  overrides: Partial<ChatCheckoutSelectorProps> = {},
): RenderResult =>
  render(
    <ChatCheckoutSelector
      checkouts={CHECKOUTS_THREE}
      maxCheckouts={2}
      multiple={true}
      onCheckoutChange={vi.fn()}
      onCheckoutsChange={vi.fn()}
      selectedCheckoutIds={['repo-a']}
      {...overrides}
    />,
  );

describe('ChatCheckoutSelector Component — multiple mode', () => {
  test('shows the primary label plus a +N affordance for secondaries', () => {
    const component = renderMulti({
      selectedCheckoutIds: ['repo-a', 'repo-b'],
    });

    const trigger = component.getByTestId('ChatCheckoutSelector-trigger');
    expect(trigger).toHaveTextContent('openthrottle');
    expect(
      component.getByTestId('ChatCheckoutSelector-overflow'),
    ).toHaveTextContent('+1');
  });

  test('omits the +N affordance when only the primary is selected', () => {
    const component = renderMulti();

    expect(
      component.queryByTestId('ChatCheckoutSelector-overflow'),
    ).not.toBeInTheDocument();
  });

  test('marks index 0 primary and every other selection context only', async () => {
    const user = userEvent.setup();
    const component = renderMulti({
      selectedCheckoutIds: ['repo-a', 'repo-b'],
    });
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));

    expect(
      component.getByTestId('ChatCheckoutSelector-primary-repo-a'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('ChatCheckoutSelector-context-repo-b'),
    ).toHaveTextContent('Context only');
    expect(
      component.queryByTestId('ChatCheckoutSelector-primary-repo-b'),
    ).not.toBeInTheDocument();
  });

  test('appends a toggled checkout after the primary and keeps the menu open', async () => {
    const onCheckoutsChange = vi.fn();
    const user = userEvent.setup();
    const component = renderMulti({ onCheckoutsChange });
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));
    await user.click(
      component.getByTestId('ChatCheckoutSelector-option-repo-b'),
    );

    expect(onCheckoutsChange).toHaveBeenCalledWith(['repo-a', 'repo-b']);
    // The menu must survive the toggle so a second pick is possible.
    expect(
      component.getByTestId('ChatCheckoutSelector-option-repo-c'),
    ).toBeInTheDocument();
  });

  test('deselects an already-selected checkout', async () => {
    const onCheckoutsChange = vi.fn();
    const user = userEvent.setup();
    const component = renderMulti({
      onCheckoutsChange,
      selectedCheckoutIds: ['repo-a', 'repo-b'],
    });
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));
    await user.click(
      component.getByTestId('ChatCheckoutSelector-option-repo-b'),
    );

    expect(onCheckoutsChange).toHaveBeenCalledWith(['repo-a']);
  });

  test('disables unselected rows at the cap but leaves selected ones toggleable', async () => {
    const user = userEvent.setup();
    const component = renderMulti({
      selectedCheckoutIds: ['repo-a', 'repo-b'],
    });
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));

    expect(
      component.getByTestId('ChatCheckoutSelector-option-repo-c'),
    ).toHaveAttribute('data-disabled');
    expect(
      component.getByTestId('ChatCheckoutSelector-option-repo-b'),
    ).not.toHaveAttribute('data-disabled');
  });

  test('stays single-select when onCheckoutsChange is absent', async () => {
    const onCheckoutChange = vi.fn();
    const user = userEvent.setup();
    const component = render(
      <ChatCheckoutSelector
        checkouts={CHECKOUTS_THREE}
        maxCheckouts={2}
        multiple={true}
        onCheckoutChange={onCheckoutChange}
        selectedCheckoutId="repo-a"
      />,
    );
    await user.click(component.getByTestId('ChatCheckoutSelector-trigger'));
    await user.click(
      component.getByTestId('ChatCheckoutSelector-option-repo-b'),
    );

    expect(onCheckoutChange).toHaveBeenCalledWith('repo-b');
  });
});
