import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { ChatSlashCommandPopover } from '../ChatSlashCommandPopover';
import type { ChatSlashCommandPopoverProps } from '../ChatSlashCommandPopover';
import type { ChatSlashCommand } from '../../types';

const COMMANDS: readonly ChatSlashCommand[] = [
  { description: 'List available skills', slug: 'skills' },
  { description: 'Deploy to Vercel', disabledForModel: true, slug: 'deploy' },
];

const renderPopover = (
  overrides: Partial<ChatSlashCommandPopoverProps> = {},
): RenderResult =>
  render(
    <ChatSlashCommandPopover
      activeIndex={0}
      emptyLabel="No skills found"
      listboxId="slash-listbox"
      loading={false}
      loadingLabel="Loading skills…"
      onHoverOption={vi.fn()}
      onSelectOption={vi.fn()}
      optionId={(index) => `slash-option-${index}`}
      results={COMMANDS}
      {...overrides}
    />,
  );

describe('ChatSlashCommandPopover', () => {
  test('renders the root container', () => {
    const component = renderPopover();

    expect(
      component.getByTestId('ChatSlashCommandPopover'),
    ).toBeInTheDocument();
  });

  test('shows the loading label while loading', () => {
    const component = renderPopover({ loading: true });

    expect(component.getByText('Loading skills…')).toBeInTheDocument();
    expect(component.getByRole('status')).toBeInTheDocument();
  });

  test('shows the empty label when there are no results', () => {
    const component = renderPopover({ results: [] });

    expect(component.getByText('No skills found')).toBeInTheDocument();
  });

  test('renders a listbox option per command with slug and description', () => {
    const component = renderPopover();

    expect(component.getByRole('listbox')).toBeInTheDocument();
    expect(component.getAllByRole('option')).toHaveLength(2);
    expect(component.getByText('/skills')).toBeInTheDocument();
    expect(component.getByText('List available skills')).toBeInTheDocument();
  });

  test('marks a model-disabled command with a Manual badge', () => {
    const component = renderPopover();

    expect(component.getByText('Manual')).toBeInTheDocument();
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

    await user.hover(component.getByText('/deploy'));

    expect(onHoverOption).toHaveBeenCalledWith(1);
  });

  test('calls onSelectOption with the slug on click', async () => {
    const onSelectOption = vi.fn();
    const component = renderPopover({ onSelectOption });
    const user = userEvent.setup();

    await user.click(component.getByText('/skills'));

    expect(onSelectOption).toHaveBeenCalledWith('skills');
  });
});
