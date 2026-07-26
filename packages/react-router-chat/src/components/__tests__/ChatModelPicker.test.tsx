import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { ChatModelPicker } from '../ChatModelPicker';
import type { ChatModelPickerProps } from '../ChatModelPicker';
import type { ChatModelGroup, ChatModelOption } from '../../types';

const GROUPS: readonly ChatModelGroup[] = [
  { id: 'claude', label: 'Claude Code' },
  { id: 'codex', label: 'Codex' },
];

const MODELS: readonly ChatModelOption[] = [
  { favorite: true, groupId: 'claude', id: 'claude::opus', label: 'Opus 4.8' },
  {
    groupId: 'claude',
    id: 'claude::sonnet',
    label: 'Sonnet 4.6',
    shortcut: '⌘1',
  },
  { groupId: 'codex', id: 'codex::gpt5', label: 'GPT-5', subLabel: 'Codex' },
];

const renderPicker = (
  overrides: Partial<ChatModelPickerProps> = {},
): RenderResult =>
  render(
    <ChatModelPicker
      groups={GROUPS}
      models={MODELS}
      onModelChange={vi.fn()}
      selectedModelId="claude::opus"
      {...overrides}
    />,
  );

const openPicker = async (
  component: RenderResult,
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> => {
  await user.click(component.getByTestId('ChatModelPicker-trigger'));
};

describe('ChatModelPicker Component', () => {
  test('renders the selected model label on the trigger', () => {
    const component = renderPicker();

    expect(component.getByTestId('ChatModelPicker-trigger')).toHaveTextContent(
      'Opus 4.8',
    );
  });

  test('renders a Favorites group plus a group per provider when opened', async () => {
    const user = userEvent.setup();
    const component = renderPicker();
    await openPicker(component, user);

    expect(
      component.getByTestId('ChatModelPicker-group-__favorites__'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('ChatModelPicker-group-claude'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('ChatModelPicker-group-codex'),
    ).toBeInTheDocument();
  });

  test('calls onModelChange with the chosen model id', async () => {
    const onModelChange = vi.fn();
    const user = userEvent.setup();
    const component = renderPicker({ onModelChange });
    await openPicker(component, user);

    await user.click(
      component.getByTestId('ChatModelPicker-option-codex-codex::gpt5'),
    );

    expect(onModelChange).toHaveBeenCalledWith('codex::gpt5');
  });

  test('filters rows by the search input', async () => {
    const user = userEvent.setup();
    const component = renderPicker();
    await openPicker(component, user);

    await user.type(component.getByTestId('ChatModelPicker-search'), 'gpt');

    expect(
      component.getByTestId('ChatModelPicker-option-codex-codex::gpt5'),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('ChatModelPicker-option-claude-claude::sonnet'),
    ).not.toBeInTheDocument();
  });

  test('toggles favorite without selecting the row', async () => {
    const onModelChange = vi.fn();
    const onToggleFavorite = vi.fn();
    const user = userEvent.setup();
    const component = renderPicker({ onModelChange, onToggleFavorite });
    await openPicker(component, user);

    await user.click(
      component.getByTestId('ChatModelPicker-favorite-codex-codex::gpt5'),
    );

    expect(onToggleFavorite).toHaveBeenCalledWith('codex::gpt5');
    expect(onModelChange).not.toHaveBeenCalled();
  });

  test('does not select a capability-gated (disabled) model', async () => {
    const onModelChange = vi.fn();
    const user = userEvent.setup();
    const component = renderPicker({
      disabledModelIds: ['codex::gpt5'],
      onModelChange,
    });
    await openPicker(component, user);

    await user.click(
      component.getByTestId('ChatModelPicker-option-codex-codex::gpt5'),
    );

    expect(onModelChange).not.toHaveBeenCalled();
  });

  test('renders a favorites-only picker (every model favorited)', async () => {
    const onModelChange = vi.fn();
    const user = userEvent.setup();
    const favouriteModels: readonly ChatModelOption[] = MODELS.map((model) => ({
      ...model,
      favorite: true,
    }));
    const component = renderPicker({
      models: favouriteModels,
      onModelChange,
    });
    await openPicker(component, user);

    expect(
      component.getByTestId('ChatModelPicker-group-__favorites__'),
    ).toBeInTheDocument();
    // The favorited model still appears under its provider group too, so it is
    // selectable from either — pick it from the Favorites group.
    await user.click(
      component.getByTestId('ChatModelPicker-option-__favorites__-codex::gpt5'),
    );
    expect(onModelChange).toHaveBeenCalledWith('codex::gpt5');
  });

  test('shows the empty state and a placeholder trigger with no models', async () => {
    const user = userEvent.setup();
    const component = renderPicker({
      models: [],
      placeholder: 'Select model',
      selectedModelId: undefined,
    });

    expect(component.getByTestId('ChatModelPicker-trigger')).toHaveTextContent(
      'Select model',
    );
    await openPicker(component, user);
    expect(component.getByText('No models found.')).toBeInTheDocument();
  });

  test('supports keyboard navigation to select a filtered row', async () => {
    const onModelChange = vi.fn();
    const user = userEvent.setup();
    const component = renderPicker({ onModelChange });
    await openPicker(component, user);

    const search = component.getByTestId('ChatModelPicker-search');
    await user.type(search, 'sonnet');
    await user.keyboard('{Enter}');

    expect(onModelChange).toHaveBeenCalledWith('claude::sonnet');
  });
});
