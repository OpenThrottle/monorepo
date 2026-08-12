import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test, vi } from 'vitest';
import { ChatComposerModelControl } from '../ChatComposerModelControl';
import type { ChatComposerModelControlProps } from '../ChatComposerModelControl';
import type { ChatModelGroup, ChatModelOption } from '../../types';

const MODELS: readonly ChatModelOption[] = [
  { id: 'opus', label: 'Opus 4.8' },
  { id: 'sonnet', label: 'Sonnet 4.6' },
];

const GROUPED_MODELS: readonly ChatModelOption[] = [
  { groupId: 'claude', id: 'claude::opus', label: 'Opus 4.8' },
  { groupId: 'codex', id: 'codex::gpt5', label: 'GPT-5', subLabel: 'Codex' },
];

const MODEL_GROUPS: readonly ChatModelGroup[] = [
  { id: 'claude', label: 'Claude Code' },
  { id: 'codex', label: 'Codex' },
];

const renderControl = (
  props: ChatComposerModelControlProps = {},
): RenderResult =>
  render(
    <TooltipProvider>
      <ChatComposerModelControl {...props} />
    </TooltipProvider>,
  );

describe('ChatComposerModelControl Component', () => {
  test('renders nothing when no models are supplied', () => {
    const component = renderControl();

    expect(
      component.queryByTestId('ChatComposerToolbar-model-select'),
    ).not.toBeInTheDocument();
    expect(
      component.queryByTestId('ChatModelPicker-trigger'),
    ).not.toBeInTheDocument();
  });

  test('renders nothing with an empty models array', () => {
    const component = renderControl({ models: [] });

    expect(
      component.queryByTestId('ChatComposerToolbar-model-select'),
    ).not.toBeInTheDocument();
  });

  test('renders the flat select when no modelGroups are supplied', () => {
    const component = renderControl({ modelId: 'opus', models: MODELS });

    expect(
      component.getByTestId('ChatComposerToolbar-model-select'),
    ).toHaveTextContent('Opus 4.8');
    expect(
      component.queryByTestId('ChatModelPicker-trigger'),
    ).not.toBeInTheDocument();
  });

  test('calls onModelChange from the flat select', async () => {
    const onModelChange = vi.fn();
    const component = renderControl({
      modelId: 'opus',
      models: MODELS,
      onModelChange,
    });

    const user = userEvent.setup();
    await user.click(component.getByTestId('ChatComposerToolbar-model-select'));
    await user.click(component.getByRole('option', { name: 'Sonnet 4.6' }));

    expect(onModelChange).toHaveBeenCalledWith('sonnet');
  });

  test('upgrades to the grouped ChatModelPicker when modelGroups are supplied', () => {
    const component = renderControl({
      modelGroups: MODEL_GROUPS,
      modelId: 'claude::opus',
      models: GROUPED_MODELS,
    });

    expect(
      component.getByTestId('ChatModelPicker-trigger'),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('ChatComposerToolbar-model-select'),
    ).not.toBeInTheDocument();
  });

  test('calls onModelChange from the grouped picker', async () => {
    const onModelChange = vi.fn();
    const component = renderControl({
      modelGroups: MODEL_GROUPS,
      modelId: 'claude::opus',
      models: GROUPED_MODELS,
      onModelChange,
    });

    const user = userEvent.setup();
    await user.click(component.getByTestId('ChatModelPicker-trigger'));
    await user.click(component.getByTestId('ChatModelPicker-rail-item-codex'));
    await user.click(
      component.getByTestId('ChatModelPicker-option-codex-codex::gpt5'),
    );

    expect(onModelChange).toHaveBeenCalledWith('codex::gpt5');
  });

  test('does not throw when onModelChange is omitted from the grouped picker', async () => {
    const component = renderControl({
      modelGroups: MODEL_GROUPS,
      modelId: 'claude::opus',
      models: GROUPED_MODELS,
    });

    const user = userEvent.setup();
    await user.click(component.getByTestId('ChatModelPicker-trigger'));
    await user.click(component.getByTestId('ChatModelPicker-rail-item-codex'));

    await expect(
      user.click(
        component.getByTestId('ChatModelPicker-option-codex-codex::gpt5'),
      ),
    ).resolves.not.toThrow();
  });

  test('forwards onToggleFavorite to the grouped picker', async () => {
    const onToggleFavorite = vi.fn();
    const component = renderControl({
      modelGroups: MODEL_GROUPS,
      modelId: 'claude::opus',
      models: GROUPED_MODELS,
      onToggleFavorite,
    });

    const user = userEvent.setup();
    await user.click(component.getByTestId('ChatModelPicker-trigger'));
    await user.click(component.getByTestId('ChatModelPicker-rail-item-codex'));
    await user.click(
      component.getByTestId('ChatModelPicker-favorite-codex-codex::gpt5'),
    );

    expect(onToggleFavorite).toHaveBeenCalledWith('codex::gpt5');
  });
});
