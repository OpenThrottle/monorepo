import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test, vi } from 'vitest';
import { ChatComposerModelSelect } from '../ChatComposerModelSelect';
import type { ChatComposerModelSelectProps } from '../ChatComposerModelSelect';
import type { ChatModelOption } from '../../types';

const MODELS: readonly ChatModelOption[] = [
  { id: 'opus', label: 'Opus 4.8' },
  { id: 'sonnet', label: 'Sonnet 4.6' },
];

const renderSelect = (props: ChatComposerModelSelectProps): RenderResult =>
  render(
    <TooltipProvider>
      <ChatComposerModelSelect {...props} />
    </TooltipProvider>,
  );

describe('ChatComposerModelSelect Component', () => {
  test('renders the selected model label on the trigger', () => {
    const component = renderSelect({
      models: MODELS,
      selectedModelId: 'sonnet',
    });

    const select = component.getByTestId('ChatComposerToolbar-model-select');
    expect(select).toBeInTheDocument();
    expect(select).toHaveTextContent('Sonnet 4.6');
  });

  test('shows a placeholder when no model is selected', () => {
    const component = renderSelect({ models: MODELS });

    expect(
      component.getByTestId('ChatComposerToolbar-model-select'),
    ).toHaveTextContent('Model');
  });

  test('calls onModelChange when a model is chosen', async () => {
    const onModelChange = vi.fn();
    const component = renderSelect({
      models: MODELS,
      onModelChange,
      selectedModelId: 'opus',
    });

    const user = userEvent.setup();
    await user.click(component.getByTestId('ChatComposerToolbar-model-select'));
    await user.click(component.getByRole('option', { name: 'Sonnet 4.6' }));

    expect(onModelChange).toHaveBeenCalledWith('sonnet');
  });

  test('renders every supplied model as an option', async () => {
    const component = renderSelect({ models: MODELS });

    const user = userEvent.setup();
    await user.click(component.getByTestId('ChatComposerToolbar-model-select'));

    expect(
      component.getByRole('option', { name: 'Opus 4.8' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('option', { name: 'Sonnet 4.6' }),
    ).toBeInTheDocument();
  });
});
