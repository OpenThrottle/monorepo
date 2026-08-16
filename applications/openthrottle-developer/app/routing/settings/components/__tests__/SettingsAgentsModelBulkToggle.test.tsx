import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SettingsAgentsModelBulkToggle } from '../SettingsAgentsModelBulkToggle';

const renderBulk = (
  props: React.ComponentProps<typeof SettingsAgentsModelBulkToggle>,
  action: (formData: FormData) => void = () => {},
) => {
  const Component = () => <SettingsAgentsModelBulkToggle {...props} />;
  const RoutesStub = createRoutesStub([
    { Component, path: '/' },
    {
      action: async ({ request }) => {
        action(await request.formData());
        return { backend: props.backend, enabled: true, errorMessage: null };
      },
      path: '/resources/agent-models-enabled',
    },
  ]);
  return render(<RoutesStub />);
};

describe('SettingsAgentsModelBulkToggle', () => {
  test('enable-all submits enabled=true with the full model list', async () => {
    const user = userEvent.setup();
    const submitted: FormData[] = [];
    const component = renderBulk(
      {
        agentDisabled: false,
        backend: 'cursor',
        canManage: true,
        enabledCount: 1,
        models: ['a', 'b', 'c'],
      },
      (formData) => submitted.push(formData),
    );

    await user.click(
      component.getByTestId('SettingsAgentsModelBulkToggle-cursor-enable'),
    );

    expect(submitted).toHaveLength(1);
    expect(submitted[0]?.get('backend')).toBe('cursor');
    expect(submitted[0]?.get('enabled')).toBe('true');
    expect(submitted[0]?.get('models')).toBe(JSON.stringify(['a', 'b', 'c']));
  });

  test('disable-all submits enabled=false', async () => {
    const user = userEvent.setup();
    const submitted: FormData[] = [];
    const component = renderBulk(
      {
        agentDisabled: false,
        backend: 'cursor',
        canManage: true,
        enabledCount: 3,
        models: ['a', 'b', 'c'],
      },
      (formData) => submitted.push(formData),
    );

    await user.click(
      component.getByTestId('SettingsAgentsModelBulkToggle-cursor-disable'),
    );

    expect(submitted).toHaveLength(1);
    expect(submitted[0]?.get('enabled')).toBe('false');
  });

  test('enable-all is disabled when every model is already enabled', () => {
    const component = renderBulk({
      agentDisabled: false,
      backend: 'cursor',
      canManage: true,
      enabledCount: 3,
      models: ['a', 'b', 'c'],
    });
    expect(
      component.getByTestId('SettingsAgentsModelBulkToggle-cursor-enable'),
    ).toBeDisabled();
  });

  test('both controls are inert when the agent is disabled', () => {
    const component = renderBulk({
      agentDisabled: true,
      backend: 'cursor',
      canManage: true,
      enabledCount: 1,
      models: ['a', 'b'],
    });
    expect(
      component.getByTestId('SettingsAgentsModelBulkToggle-cursor-enable'),
    ).toBeDisabled();
    expect(
      component.getByTestId('SettingsAgentsModelBulkToggle-cursor-disable'),
    ).toBeDisabled();
  });

  test('both controls are inert without manage permission', () => {
    const component = renderBulk({
      agentDisabled: false,
      backend: 'cursor',
      canManage: false,
      enabledCount: 1,
      models: ['a', 'b'],
    });
    expect(
      component.getByTestId('SettingsAgentsModelBulkToggle-cursor-enable'),
    ).toBeDisabled();
    expect(
      component.getByTestId('SettingsAgentsModelBulkToggle-cursor-disable'),
    ).toBeDisabled();
  });
});
