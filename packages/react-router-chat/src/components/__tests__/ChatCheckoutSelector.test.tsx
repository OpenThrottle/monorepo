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
