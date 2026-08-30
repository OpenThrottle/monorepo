import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test, vi } from 'vitest';
import { ChatModelPicker } from '../ChatModelPicker';
import type { ChatModelGroup, ChatModelOption } from '../../types';

/**
 * @description The collapsed-shortlist behavior that makes a several-hundred-
 * entry gateway catalog usable in the picker: a group whose options flag
 * `shortlist` opens showing only those, with a `+N more` hint, and typing
 * reveals the whole group. A group that flags nothing is untouched.
 */

const GROUPS: readonly ChatModelGroup[] = [
  { id: 'openrouter', label: 'OpenRouter' },
];

/** Two shortlisted flagships and three that sit behind the search box. */
const MODELS: readonly ChatModelOption[] = [
  {
    groupId: 'openrouter',
    id: 'openrouter|anthropic/claude-sonnet-5',
    label: 'Anthropic: Claude Sonnet 5',
    shortlist: true,
    subLabel: 'anthropic/claude-sonnet-5',
  },
  {
    groupId: 'openrouter',
    id: 'openrouter|openai/gpt-6',
    label: 'OpenAI: GPT-6',
    shortlist: true,
    subLabel: 'openai/gpt-6',
  },
  {
    groupId: 'openrouter',
    id: 'openrouter|aion-labs/aion-3.0',
    label: 'AionLabs: Aion 3.0',
    subLabel: 'aion-labs/aion-3.0',
  },
  {
    groupId: 'openrouter',
    id: 'openrouter|amazon/nova-2-lite-v1',
    label: 'Amazon: Nova 2 Lite',
    subLabel: 'amazon/nova-2-lite-v1',
  },
  {
    groupId: 'openrouter',
    id: 'openrouter|z-ai/glm-5.3-flash',
    label: 'Z.AI: GLM 5.3 Flash',
    subLabel: 'z-ai/glm-5.3-flash',
  },
];

const renderPicker = (
  overrides: Partial<React.ComponentProps<typeof ChatModelPicker>> = {},
): RenderResult =>
  render(
    <TooltipProvider>
      <ChatModelPicker
        groups={GROUPS}
        models={MODELS}
        onModelChange={vi.fn()}
        {...overrides}
      />
    </TooltipProvider>,
  );

/** Open the popover; the picker renders its list only while open. */
async function openPicker(component: RenderResult): Promise<void> {
  await userEvent.click(component.getByTestId('ChatModelPicker-trigger'));
}

describe('ChatModelPicker shortlist collapse', () => {
  test('opens showing only the shortlisted models', async () => {
    const component = renderPicker();

    await openPicker(component);

    expect(
      component.getByText('Anthropic: Claude Sonnet 5'),
    ).toBeInTheDocument();
    expect(component.getByText('OpenAI: GPT-6')).toBeInTheDocument();
    expect(component.queryByText('AionLabs: Aion 3.0')).not.toBeInTheDocument();
    expect(
      component.queryByText('Z.AI: GLM 5.3 Flash'),
    ).not.toBeInTheDocument();
  });

  test('tells the user how many are hidden', async () => {
    const component = renderPicker();

    await openPicker(component);

    expect(
      component.getByTestId('ChatModelPicker-shortlist-hint'),
    ).toHaveTextContent('+3 more');
  });

  test('searching reveals the full catalog', async () => {
    const component = renderPicker();
    await openPicker(component);

    await userEvent.type(
      component.getByTestId('ChatModelPicker-search'),
      'glm',
    );

    expect(component.getByText('Z.AI: GLM 5.3 Flash')).toBeInTheDocument();
    expect(
      component.queryByTestId('ChatModelPicker-shortlist-hint'),
    ).not.toBeInTheDocument();
  });

  test('keeps the selected model visible even when it is off the shortlist', async () => {
    const component = renderPicker({
      selectedModelId: 'openrouter|z-ai/glm-5.3-flash',
    });

    await openPicker(component);

    // Otherwise reopening would show no checked row and read as a lost selection.
    // Scoped to the popover: the trigger also renders the selected model's label.
    expect(
      component
        .getByTestId('ChatModelPicker-content')
        .textContent?.includes('Z.AI: GLM 5.3 Flash'),
    ).toBe(true);
    expect(
      component.getByTestId('ChatModelPicker-shortlist-hint'),
    ).toHaveTextContent('+2 more');
  });

  test('leaves a group that flags no shortlist entirely alone', async () => {
    const component = renderPicker({
      groups: [{ id: 'ollama', label: 'ollama' }],
      models: MODELS.map((model) => ({
        ...model,
        groupId: 'ollama',
        shortlist: undefined,
      })),
    });

    await openPicker(component);

    expect(component.getByText('AionLabs: Aion 3.0')).toBeInTheDocument();
    expect(component.getByText('Z.AI: GLM 5.3 Flash')).toBeInTheDocument();
    expect(
      component.queryByTestId('ChatModelPicker-shortlist-hint'),
    ).not.toBeInTheDocument();
  });
});
