import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test } from 'vitest';
import { SettingsSetupModelFavorite } from '../SettingsSetupModelFavorite';

const renderFavorite = (
  props: React.ComponentProps<typeof SettingsSetupModelFavorite>,
  action: (formData: FormData) => void = () => {},
) => {
  const Component = () => (
    <TooltipProvider>
      <SettingsSetupModelFavorite {...props} />
    </TooltipProvider>
  );
  const RoutesStub = createRoutesStub([
    { Component, path: '/' },
    {
      action: async ({ request }) => {
        action(await request.formData());
        return {
          backend: props.backend,
          errorMessage: null,
          favorite: true,
          model: props.model,
        };
      },
      path: '/resources/agent-model-favorite',
    },
  ]);
  return render(<RoutesStub />);
};

describe('SettingsSetupModelFavorite', () => {
  test('submits the toggled favorite state to the resource action', async () => {
    const user = userEvent.setup();
    const submitted: FormData[] = [];
    const component = renderFavorite(
      { backend: 'cursor', canManage: true, favorite: false, model: 'gpt-5.2' },
      (formData) => submitted.push(formData),
    );

    await user.click(
      component.getByTestId('SettingsSetupModelFavorite-cursor-gpt-5.2'),
    );

    expect(submitted).toHaveLength(1);
    expect(submitted[0]?.get('backend')).toBe('cursor');
    expect(submitted[0]?.get('model')).toBe('gpt-5.2');
    // A not-favorited model toggles ON.
    expect(submitted[0]?.get('favorite')).toBe('true');
  });

  test('reflects the favorited state via aria-pressed', () => {
    const component = renderFavorite({
      backend: 'claude',
      canManage: true,
      favorite: true,
      model: 'opus',
    });
    expect(
      component.getByTestId('SettingsSetupModelFavorite-claude-opus'),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('disables the star and never submits without settings:write', async () => {
    const user = userEvent.setup();
    const submitted: FormData[] = [];
    const component = renderFavorite(
      { backend: 'grok', canManage: false, favorite: false, model: 'grok-4' },
      (formData) => submitted.push(formData),
    );

    const star = component.getByTestId(
      'SettingsSetupModelFavorite-grok-grok-4',
    );
    expect(star).toBeDisabled();
    await user.click(star);
    expect(submitted).toHaveLength(0);
  });
});
