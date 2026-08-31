import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test, vi } from 'vitest';
import { ChatModelPickerRailItem } from '../ChatModelPickerRailItem';
import type { ChatModelPickerRailItemProps } from '../ChatModelPickerRailItem';
import {
  FAVORITES_GROUP_ID,
  type ResolvedGroup,
} from '../../hooks/use-chat-model-picker';

const GROUP: ResolvedGroup = {
  hiddenCount: 0,
  id: 'claude',
  label: 'Claude Code',
  models: [],
};

const renderRailItem = (
  overrides: Partial<ChatModelPickerRailItemProps> = {},
): RenderResult =>
  render(
    <TooltipProvider>
      <ChatModelPickerRailItem
        group={GROUP}
        index={0}
        isActive={false}
        onSelect={vi.fn()}
        {...overrides}
      />
    </TooltipProvider>,
  );

describe('ChatModelPickerRailItem', () => {
  test('renders a button labeled with the group label', () => {
    const component = renderRailItem();

    expect(
      component.getByTestId('ChatModelPicker-rail-item-claude'),
    ).toHaveAttribute('aria-label', 'Claude Code');
  });

  test('falls back to a letter avatar when the group has no icon', () => {
    const component = renderRailItem();

    expect(component.getByText('C')).toBeInTheDocument();
  });

  test('renders a star icon for the synthetic Favorites group', () => {
    const component = renderRailItem({
      group: { ...GROUP, id: FAVORITES_GROUP_ID, label: 'Favorites' },
    });

    expect(
      component.getByTestId(`ChatModelPicker-rail-item-${FAVORITES_GROUP_ID}`),
    ).toBeInTheDocument();
    expect(component.queryByText('F')).not.toBeInTheDocument();
  });

  test('renders the supplied icon when present', () => {
    const component = renderRailItem({
      group: { ...GROUP, icon: <span>ICON</span> },
    });

    expect(component.getByText('ICON')).toBeInTheDocument();
    expect(component.queryByText('C')).not.toBeInTheDocument();
  });

  test('reflects the active state via aria-pressed and data-active', () => {
    const component = renderRailItem({ isActive: true });

    const button = component.getByTestId('ChatModelPicker-rail-item-claude');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('data-active', 'true');
  });

  test('calls onSelect with the group id when clicked', async () => {
    const onSelect = vi.fn();
    const component = renderRailItem({ onSelect });
    const user = userEvent.setup();

    await user.click(component.getByTestId('ChatModelPicker-rail-item-claude'));

    expect(onSelect).toHaveBeenCalledWith('claude');
  });
});
