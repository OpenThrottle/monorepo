import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test, vi } from 'vitest';
import { ChatComposerAttachControl } from '../ChatComposerAttachControl';
import type { ChatComposerAttachControlProps } from '../ChatComposerAttachControl';
import type { ChatContextSource } from '../../types';

const SOURCES: readonly ChatContextSource[] = [
  { id: 'file', label: 'File' },
  { id: 'project', label: 'Project' },
];

const renderControl = (props: ChatComposerAttachControlProps): RenderResult =>
  render(
    <TooltipProvider>
      <ChatComposerAttachControl {...props} />
    </TooltipProvider>,
  );

describe('ChatComposerAttachControl Component', () => {
  test('renders nothing when no onAddContext callback is supplied', () => {
    const component = renderControl({ contextSources: SOURCES });

    expect(
      component.queryByTestId('ChatComposerToolbar-attach'),
    ).not.toBeInTheDocument();
  });

  test('is disabled when no context sources are supplied', () => {
    const component = renderControl({ onAddContext: vi.fn() });

    expect(component.getByTestId('ChatComposerToolbar-attach')).toBeDisabled();
  });

  test('is disabled with an empty context sources array', () => {
    const component = renderControl({
      contextSources: [],
      onAddContext: vi.fn(),
    });

    expect(component.getByTestId('ChatComposerToolbar-attach')).toBeDisabled();
  });

  test('opens a menu of context sources and calls onAddContext with the chosen id', async () => {
    const onAddContext = vi.fn();
    const component = renderControl({
      contextSources: SOURCES,
      onAddContext,
    });

    const attach = component.getByTestId('ChatComposerToolbar-attach');
    expect(attach).not.toBeDisabled();

    const user = userEvent.setup();
    await user.click(attach);
    await user.click(component.getByRole('menuitem', { name: 'Project' }));

    expect(onAddContext).toHaveBeenCalledWith('project');
  });
});
