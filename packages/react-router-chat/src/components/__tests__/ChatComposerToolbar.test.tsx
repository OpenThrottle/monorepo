import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test, vi } from 'vitest';
import { ChatComposerToolbar } from '../ChatComposerToolbar';
import type { ChatComposerToolbarProps } from '../ChatComposerToolbar';
import { ChatComposerMode } from '../../types';
import type { ChatModelOption, ChatPersonaOption } from '../../types';

const MODELS: readonly ChatModelOption[] = [
  { id: 'opus', label: 'Opus 4.8' },
  { id: 'sonnet', label: 'Sonnet 4.6' },
];

const PERSONAS: readonly ChatPersonaOption[] = [
  { id: 'architect', label: 'Architect' },
  { id: 'builder', label: 'Builder' },
];

const renderToolbar = (props: ChatComposerToolbarProps): RenderResult =>
  render(
    <TooltipProvider>
      <ChatComposerToolbar {...props} />
    </TooltipProvider>,
  );

describe('ChatComposerToolbar Component', () => {
  test('renders an empty bar when no controls are supplied', () => {
    const component = renderToolbar({});

    expect(component.getByTestId('ChatComposerToolbar')).toBeInTheDocument();
    expect(
      component.queryByTestId('ChatComposerToolbar-model-select'),
    ).not.toBeInTheDocument();
  });

  describe('model selector', () => {
    test('renders the selected model from props', () => {
      const component = renderToolbar({ modelId: 'sonnet', models: MODELS });

      const select = component.getByTestId('ChatComposerToolbar-model-select');
      expect(select).toBeInTheDocument();
      expect(select).toHaveTextContent('Sonnet 4.6');
    });

    test('calls onModelChange when a model is selected', async () => {
      const onModelChange = vi.fn();
      const component = renderToolbar({
        modelId: 'opus',
        models: MODELS,
        onModelChange,
      });

      const user = userEvent.setup();
      await user.click(
        component.getByTestId('ChatComposerToolbar-model-select'),
      );
      await user.click(component.getByRole('option', { name: 'Sonnet 4.6' }));

      expect(onModelChange).toHaveBeenCalledWith('sonnet');
    });
  });

  describe('persona selector', () => {
    test('renders the selected persona from props', () => {
      const component = renderToolbar({
        personaId: 'builder',
        personas: PERSONAS,
      });

      const select = component.getByTestId(
        'ChatComposerToolbar-persona-select',
      );
      expect(select).toBeInTheDocument();
      expect(select).toHaveTextContent('Builder');
    });

    test('calls onPersonaChange when a persona is selected', async () => {
      const onPersonaChange = vi.fn();
      const component = renderToolbar({
        onPersonaChange,
        personaId: 'architect',
        personas: PERSONAS,
      });

      const user = userEvent.setup();
      await user.click(
        component.getByTestId('ChatComposerToolbar-persona-select'),
      );
      await user.click(component.getByRole('option', { name: 'Builder' }));

      expect(onPersonaChange).toHaveBeenCalledWith('builder');
    });
  });

  describe('mode toggle', () => {
    test('renders Plan and Build when a mode is supplied', () => {
      const component = renderToolbar({ mode: ChatComposerMode.plan });

      expect(
        component.getByTestId('ChatComposerToolbar-mode-toggle'),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('ChatComposerToolbar-mode-plan'),
      ).toHaveTextContent('Plan');
      expect(
        component.getByTestId('ChatComposerToolbar-mode-build'),
      ).toHaveTextContent('Build');
    });

    test('calls onModeChange when the other mode is pressed', async () => {
      const onModeChange = vi.fn();
      const component = renderToolbar({
        mode: ChatComposerMode.plan,
        onModeChange,
      });

      const user = userEvent.setup();
      await user.click(component.getByTestId('ChatComposerToolbar-mode-build'));

      expect(onModeChange).toHaveBeenCalledWith(ChatComposerMode.build);
    });
  });
});
