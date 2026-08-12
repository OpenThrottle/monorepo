import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test, vi } from 'vitest';
import { ChatComposerPersonaSelect } from '../ChatComposerPersonaSelect';
import type { ChatComposerPersonaSelectProps } from '../ChatComposerPersonaSelect';
import type { ChatPersonaOption } from '../../types';

const PERSONAS: readonly ChatPersonaOption[] = [
  { id: 'architect', label: 'Architect' },
  { id: 'builder', label: 'Builder' },
];

const renderSelect = (
  props: ChatComposerPersonaSelectProps = {},
): RenderResult =>
  render(
    <TooltipProvider>
      <ChatComposerPersonaSelect {...props} />
    </TooltipProvider>,
  );

describe('ChatComposerPersonaSelect Component', () => {
  test('renders nothing when no personas are supplied', () => {
    const component = renderSelect();

    expect(
      component.queryByTestId('ChatComposerToolbar-persona-select'),
    ).not.toBeInTheDocument();
  });

  test('renders nothing with an empty personas array', () => {
    const component = renderSelect({ personas: [] });

    expect(
      component.queryByTestId('ChatComposerToolbar-persona-select'),
    ).not.toBeInTheDocument();
  });

  test('renders the selected persona label on the trigger', () => {
    const component = renderSelect({
      personas: PERSONAS,
      selectedPersonaId: 'builder',
    });

    const select = component.getByTestId('ChatComposerToolbar-persona-select');
    expect(select).toBeInTheDocument();
    expect(select).toHaveTextContent('Builder');
  });

  test('calls onPersonaChange when a persona is chosen', async () => {
    const onPersonaChange = vi.fn();
    const component = renderSelect({
      onPersonaChange,
      personas: PERSONAS,
      selectedPersonaId: 'architect',
    });

    const user = userEvent.setup();
    await user.click(
      component.getByTestId('ChatComposerToolbar-persona-select'),
    );
    await user.click(component.getByRole('option', { name: 'Builder' }));

    expect(onPersonaChange).toHaveBeenCalledWith('builder');
  });
});
