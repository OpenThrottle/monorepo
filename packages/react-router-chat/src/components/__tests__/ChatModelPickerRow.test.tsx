import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Command, CommandList } from '@openthrottle/react-router-shadcn';
import { describe, expect, test, vi } from 'vitest';
import { ChatModelPickerRow } from '../ChatModelPickerRow';
import type { ChatModelPickerRowProps } from '../ChatModelPickerRow';
import type { ChatModelOption } from '../../types';

const MODEL: ChatModelOption = {
  groupId: 'claude',
  id: 'claude::opus',
  label: 'Opus 4.8',
};

// CommandItem (cmdk) requires a Command/CommandList ancestor to render/filter.
const renderRow = (
  overrides: Partial<ChatModelPickerRowProps> = {},
): RenderResult =>
  render(
    <Command>
      <CommandList>
        <ChatModelPickerRow
          groupId="claude"
          isDisabled={false}
          isSelected={false}
          model={MODEL}
          onSelect={vi.fn()}
          {...overrides}
        />
      </CommandList>
    </Command>,
  );

describe('ChatModelPickerRow', () => {
  test('renders the model label', () => {
    const component = renderRow();

    expect(component.getByText('Opus 4.8')).toBeInTheDocument();
  });

  test('renders the sub-label when present', () => {
    const component = renderRow({
      model: { ...MODEL, subLabel: 'Claude' },
    });

    expect(component.getByText('Claude')).toBeInTheDocument();
  });

  test('renders the shortcut hint when present', () => {
    const component = renderRow({
      model: { ...MODEL, shortcut: '⌘1' },
    });

    expect(component.getByText('⌘1')).toBeInTheDocument();
  });

  test('calls onSelect with the model id when clicked', async () => {
    const onSelect = vi.fn();
    const component = renderRow({ onSelect });
    const user = userEvent.setup();

    await user.click(
      component.getByTestId('ChatModelPicker-option-claude-claude::opus'),
    );

    expect(onSelect).toHaveBeenCalledWith('claude::opus');
  });

  test('marks the row disabled and does not fire onSelect when clicked', async () => {
    const onSelect = vi.fn();
    const component = renderRow({ isDisabled: true, onSelect });
    const user = userEvent.setup();

    const row = component.getByTestId(
      'ChatModelPicker-option-claude-claude::opus',
    );
    expect(row).toHaveAttribute('aria-disabled', 'true');

    await user.click(row);

    expect(onSelect).not.toHaveBeenCalled();
  });

  test('hides the favorite toggle when onToggleFavorite is omitted', () => {
    const component = renderRow();

    expect(
      component.queryByTestId('ChatModelPicker-favorite-claude-claude::opus'),
    ).not.toBeInTheDocument();
  });

  test('toggles favorite without firing onSelect', async () => {
    const onSelect = vi.fn();
    const onToggleFavorite = vi.fn();
    const component = renderRow({ onSelect, onToggleFavorite });
    const user = userEvent.setup();

    await user.click(
      component.getByTestId('ChatModelPicker-favorite-claude-claude::opus'),
    );

    expect(onToggleFavorite).toHaveBeenCalledWith('claude::opus');
    expect(onSelect).not.toHaveBeenCalled();
  });

  test('shows the favorite button as pressed when the model is favorited', () => {
    const component = renderRow({
      model: { ...MODEL, favorite: true },
      onToggleFavorite: vi.fn(),
    });

    expect(
      component.getByTestId('ChatModelPicker-favorite-claude-claude::opus'),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
