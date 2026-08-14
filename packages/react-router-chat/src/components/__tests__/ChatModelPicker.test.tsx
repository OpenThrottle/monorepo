import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
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
    <TooltipProvider>
      <ChatModelPicker
        groups={GROUPS}
        models={MODELS}
        onModelChange={vi.fn()}
        selectedModelId="claude::opus"
        {...overrides}
      />
    </TooltipProvider>,
  );

const openPicker = async (
  component: RenderResult,
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> => {
  await user.click(component.getByTestId('ChatModelPicker-trigger'));
};

const selectRail = async (
  component: RenderResult,
  user: ReturnType<typeof userEvent.setup>,
  groupId: string,
): Promise<void> => {
  await user.click(
    component.getByTestId(`ChatModelPicker-rail-item-${groupId}`),
  );
};

describe('ChatModelPicker Component', () => {
  test('renders the selected model label on the trigger', () => {
    const component = renderPicker();

    expect(component.getByTestId('ChatModelPicker-trigger')).toHaveTextContent(
      'Opus 4.8',
    );
  });

  test('renders a Favorites rail entry plus one per provider when opened', async () => {
    const user = userEvent.setup();
    const component = renderPicker();
    await openPicker(component, user);

    expect(component.getByTestId('ChatModelPicker-rail')).toBeInTheDocument();
    expect(
      component.getByTestId('ChatModelPicker-rail-item-__favorites__'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('ChatModelPicker-rail-item-claude'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('ChatModelPicker-rail-item-codex'),
    ).toBeInTheDocument();
  });

  test('opens onto the selected model group and switches the list on rail click', async () => {
    const user = userEvent.setup();
    const component = renderPicker();
    await openPicker(component, user);

    // Opus is favorited, so the picker opens on the Favorites rail entry: its
    // row is visible while the codex model is not yet rendered.
    expect(
      component.getByTestId(
        'ChatModelPicker-option-__favorites__-claude::opus',
      ),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('ChatModelPicker-option-codex-codex::gpt5'),
    ).not.toBeInTheDocument();

    await selectRail(component, user, 'codex');

    expect(
      component.getByTestId('ChatModelPicker-option-codex-codex::gpt5'),
    ).toBeInTheDocument();
  });

  test('calls onModelChange with the chosen model id', async () => {
    const onModelChange = vi.fn();
    const user = userEvent.setup();
    const component = renderPicker({ onModelChange });
    await openPicker(component, user);
    await selectRail(component, user, 'codex');

    await user.click(
      component.getByTestId('ChatModelPicker-option-codex-codex::gpt5'),
    );

    expect(onModelChange).toHaveBeenCalledWith('codex::gpt5');
  });

  test('search filters within the active provider only', async () => {
    const user = userEvent.setup();
    const component = renderPicker();
    await openPicker(component, user);
    await selectRail(component, user, 'claude');

    await user.type(component.getByTestId('ChatModelPicker-search'), 'sonnet');

    // Matches the active (claude) group...
    expect(
      component.getByTestId('ChatModelPicker-option-claude-claude::sonnet'),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('ChatModelPicker-option-claude-claude::opus'),
    ).not.toBeInTheDocument();
    // ...and never leaks a matching row from another provider group.
    expect(
      component.queryByTestId('ChatModelPicker-option-codex-codex::gpt5'),
    ).not.toBeInTheDocument();
  });

  test('resets the search when switching rails', async () => {
    const user = userEvent.setup();
    const component = renderPicker();
    await openPicker(component, user);
    await selectRail(component, user, 'claude');

    await user.type(component.getByTestId('ChatModelPicker-search'), 'sonnet');
    await selectRail(component, user, 'codex');

    expect(component.getByTestId('ChatModelPicker-search')).toHaveValue('');
    expect(
      component.getByTestId('ChatModelPicker-option-codex-codex::gpt5'),
    ).toBeInTheDocument();
  });

  test('toggles favorite without selecting the row', async () => {
    const onModelChange = vi.fn();
    const onToggleFavorite = vi.fn();
    const user = userEvent.setup();
    const component = renderPicker({ onModelChange, onToggleFavorite });
    await openPicker(component, user);
    await selectRail(component, user, 'codex');

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
    await selectRail(component, user, 'codex');

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

    // The Favorites rail entry is active by default (opus is the selection and
    // is favorited), so every model is selectable straight from it.
    expect(
      component.getByTestId('ChatModelPicker-rail-item-__favorites__'),
    ).toBeInTheDocument();
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
    await selectRail(component, user, 'claude');

    const search = component.getByTestId('ChatModelPicker-search');
    await user.type(search, 'sonnet');
    await user.keyboard('{Enter}');

    expect(onModelChange).toHaveBeenCalledWith('claude::sonnet');
  });

  test('renders the rail settings gear when onOpenSettings is provided', async () => {
    const user = userEvent.setup();
    const component = renderPicker({ onOpenSettings: vi.fn() });
    await openPicker(component, user);

    const gear = component.getByTestId('ChatModelPicker-rail-settings');
    expect(gear).toBeInTheDocument();
    expect(gear).toHaveAttribute('aria-label', 'Agent setup');
  });

  test('omits the rail settings gear when onOpenSettings is not provided', async () => {
    const user = userEvent.setup();
    const component = renderPicker();
    await openPicker(component, user);

    expect(
      component.queryByTestId('ChatModelPicker-rail-settings'),
    ).not.toBeInTheDocument();
  });

  test('invokes onOpenSettings when the rail gear is clicked', async () => {
    const onOpenSettings = vi.fn();
    const user = userEvent.setup();
    const component = renderPicker({ onOpenSettings });
    await openPicker(component, user);

    await user.click(component.getByTestId('ChatModelPicker-rail-settings'));

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
