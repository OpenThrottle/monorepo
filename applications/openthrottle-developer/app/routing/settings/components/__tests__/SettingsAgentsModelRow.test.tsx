import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test } from 'vitest';
import { SettingsAgentsModelRow } from '../SettingsAgentsModelRow';

const renderRow = (
  props: React.ComponentProps<typeof SettingsAgentsModelRow>,
) => {
  const Component = () => (
    <TooltipProvider>
      <SettingsAgentsModelRow {...props} />
    </TooltipProvider>
  );
  const RoutesStub = createRoutesStub([
    { Component, path: '/' },
    { action: () => ({ ok: true }), path: '/resources/agent-model-enabled' },
    { action: () => ({ ok: true }), path: '/resources/agent-model-favorite' },
  ]);
  return render(<RoutesStub />);
};

describe('SettingsAgentsModelRow', () => {
  test('renders the model id with an enable toggle and a favorite star', () => {
    const component = renderRow({
      agentDisabled: false,
      backend: 'cursor',
      canManage: true,
      model: { enabled: true, favorite: true, model: 'gpt-5.2' },
    });

    expect(component.getByText('gpt-5.2')).toBeInTheDocument();
    expect(
      component.getByTestId('SettingsAgentsModelToggle-cursor-gpt-5.2'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('SettingsAgentsModelFavorite-cursor-gpt-5.2'),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('disables the enable toggle when the parent agent is disabled', () => {
    const component = renderRow({
      agentDisabled: true,
      backend: 'claude',
      canManage: true,
      model: { enabled: true, favorite: false, model: 'opus' },
    });

    expect(
      component.getByTestId('SettingsAgentsModelToggle-claude-opus'),
    ).toBeDisabled();
  });
});
