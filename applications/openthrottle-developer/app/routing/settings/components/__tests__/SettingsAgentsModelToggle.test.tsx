import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { SettingsAgentsModelToggle } from '../SettingsAgentsModelToggle';

const renderToggle = (
  props: React.ComponentProps<typeof SettingsAgentsModelToggle>,
  action: (formData: FormData) => void = () => {},
) => {
  const Component = () => {
    return (
      <TooltipProvider>
        <SettingsAgentsModelToggle {...props} />
      </TooltipProvider>
    );
  };
  const RoutesStub = createRoutesStub([
    { Component, path: '/' },
    {
      action: async ({ request }) => {
        action(await request.formData());
        return {
          driver: props.driver,
          enabled: false,
          errorMessage: null,
          model: props.model,
        };
      },
      path: '/resources/agent-model-enabled',
    },
  ]);
  return render(<RoutesStub />);
};

describe('SettingsAgentsModelToggle', () => {
  test('submits the toggled model state to the resource action', async () => {
    const user = userEvent.setup();
    const submitted: FormData[] = [];
    const component = renderToggle(
      {
        agentDisabled: false,
        canManage: true,
        driver: 'cursor',
        enabled: true,
        model: 'gpt-5.2',
      },
      (formData) => submitted.push(formData),
    );

    await user.click(
      component.getByTestId('SettingsAgentsModelToggle-cursor-gpt-5.2'),
    );

    expect(submitted).toHaveLength(1);
    expect(submitted[0]?.get('driver')).toBe('cursor');
    expect(submitted[0]?.get('model')).toBe('gpt-5.2');
    // An enabled model toggles OFF.
    expect(submitted[0]?.get('enabled')).toBe('false');
  });

  test('is inert (disabled, never submits) when the agent is disabled', async () => {
    const user = userEvent.setup();
    const submitted: FormData[] = [];
    const component = renderToggle(
      {
        agentDisabled: true,
        canManage: true,
        driver: 'claude',
        enabled: true,
        model: 'opus',
      },
      (formData) => submitted.push(formData),
    );

    const toggle = component.getByTestId(
      'SettingsAgentsModelToggle-claude-opus',
    );
    expect(toggle).toBeDisabled();
    await user.click(toggle);
    expect(submitted).toHaveLength(0);
  });
});
