import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { ChatMentionPopover } from '../ChatMentionPopover';
import type { ChatMentionPopoverProps } from '../ChatMentionPopover';

const renderPopover = (
  overrides: Partial<ChatMentionPopoverProps> = {},
): RenderResult =>
  render(
    <ChatMentionPopover
      activeIndex={0}
      emptyLabel="No files found"
      listboxId="mention-listbox"
      loading={false}
      loadingLabel="Searching…"
      onHoverOption={vi.fn()}
      onSelectOption={vi.fn()}
      optionId={(index) => `mention-option-${index}`}
      results={['src/a.ts', 'src/b.ts']}
      {...overrides}
    />,
  );

describe('ChatMentionPopover', () => {
  test('renders the root container', () => {
    const component = renderPopover();

    expect(component.getByTestId('ChatMentionPopover')).toBeInTheDocument();
  });

  test('shows the loading label while loading', () => {
    const component = renderPopover({ loading: true });

    expect(component.getByText('Searching…')).toBeInTheDocument();
    expect(component.getByRole('status')).toBeInTheDocument();
  });

  test('shows the empty label when there are no results', () => {
    const component = renderPopover({ results: [] });

    expect(component.getByText('No files found')).toBeInTheDocument();
  });

  test('renders a listbox option per result', () => {
    const component = renderPopover();

    expect(component.getByRole('listbox')).toBeInTheDocument();
    expect(component.getAllByRole('option')).toHaveLength(2);
    expect(component.getByText('src/a.ts')).toBeInTheDocument();
    expect(component.getByText('src/b.ts')).toBeInTheDocument();
  });

  test('marks the active option as selected', () => {
    const component = renderPopover({ activeIndex: 1 });

    const options = component.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
  });

  test('calls onHoverOption on mouse enter', async () => {
    const onHoverOption = vi.fn();
    const component = renderPopover({ onHoverOption });
    const user = userEvent.setup();

    await user.hover(component.getByText('src/b.ts'));

    expect(onHoverOption).toHaveBeenCalledWith(1);
  });

  test('calls onSelectOption with the path on click', async () => {
    const onSelectOption = vi.fn();
    const component = renderPopover({ onSelectOption });
    const user = userEvent.setup();

    await user.click(component.getByText('src/a.ts'));

    expect(onSelectOption).toHaveBeenCalledWith('src/a.ts');
  });
});
