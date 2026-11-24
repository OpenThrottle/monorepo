import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { SettingsAgentsAgentToggle } from '../SettingsAgentsAgentToggle';

const renderToggle = (
  props: React.ComponentProps<typeof SettingsAgentsAgentToggle>,
  action: (formData: FormData) => void = () => {},
) => {
  const Component = () => {
    return (
      <TooltipProvider>
        <SettingsAgentsAgentToggle {...props} />
      </TooltipProvider>
    );
  };
  const RoutesStub = createRoutesStub([
    { Component, path: '/' },
    {
      action: async ({ request }) => {
        action(await request.formData());
        return { driver: props.driver, enabled: false, errorMessage: null };
      },
      path: '/resources/agent-enabled',
    },
  ]);
  return render(<RoutesStub />);
};

describe('SettingsAgentsAgentToggle', () => {
  test('submits the toggled state to the resource action', async () => {
    const user = userEvent.setup();
    const submitted: FormData[] = [];
    const component = renderToggle(
      { canManage: true, driver: 'cursor', enabled: true },
      (formData) => submitted.push(formData),
    );

    await user.click(component.getByTestId('SettingsAgentsAgentToggle-cursor'));

    expect(submitted).toHaveLength(1);
    expect(submitted[0]?.get('driver')).toBe('cursor');
    // An enabled agent toggles OFF.
    expect(submitted[0]?.get('enabled')).toBe('false');
  });

  test('reflects the enabled state as the switch checked state', () => {
    const component = renderToggle({
      canManage: true,
      driver: 'claude',
      enabled: false,
    });
    expect(
      component.getByTestId('SettingsAgentsAgentToggle-claude'),
    ).toHaveAttribute('data-state', 'unchecked');
  });

  test('disables the toggle and never submits without settings:write', async () => {
    const user = userEvent.setup();
    const submitted: FormData[] = [];
    const component = renderToggle(
      { canManage: false, driver: 'grok', enabled: true },
      (formData) => submitted.push(formData),
    );

    const toggle = component.getByTestId('SettingsAgentsAgentToggle-grok');
    expect(toggle).toBeDisabled();
    await user.click(toggle);
    expect(submitted).toHaveLength(0);
  });
});
