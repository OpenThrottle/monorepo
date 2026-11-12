import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import type { ChatBackendCapabilities } from '../../types';
import { ChatPermissionMode } from '../../types';
import type { ChatPermissionModeControlProps } from '../ChatPermissionModeControl';
import { ChatPermissionModeControl } from '../ChatPermissionModeControl';

const ALL_MODES: ChatBackendCapabilities = {
  maxRepositories: 1,
  permissionModes: [
    ChatPermissionMode.supervised,
    ChatPermissionMode.autoAcceptEdits,
    ChatPermissionMode.fullAccess,
  ],
  reasoningLevels: [],
  requiresRepository: true,
  serviceTiers: [],
  supportsModelFlag: false,
};

const renderControl = (
  overrides: Partial<ChatPermissionModeControlProps> = {},
): RenderResult => {
  return render(
    <ChatPermissionModeControl
      capabilities={ALL_MODES}
      permissionMode={ChatPermissionMode.supervised}
      {...overrides}
    />,
  );
};

describe('ChatPermissionModeControl Component', () => {
  test('reflects the active mode on the trigger', () => {
    const component = renderControl();

    expect(
      component.getByTestId('ChatPermissionModeControl-trigger'),
    ).toHaveTextContent('Supervised');
  });

  test('renders every capability-allowed mode with its description', async () => {
    const user = userEvent.setup();
    const component = renderControl();
    await user.click(
      component.getByTestId('ChatPermissionModeControl-trigger'),
    );

    expect(
      component.getByTestId('ChatPermissionModeControl-mode-autoAcceptEdits'),
    ).toHaveTextContent('Auto-approve edits, ask before other actions');
    expect(
      component.getByTestId('ChatPermissionModeControl-mode-fullAccess'),
    ).toBeInTheDocument();
  });

  test('only renders capability-allowed modes', async () => {
    const user = userEvent.setup();
    const component = renderControl({
      capabilities: {
        ...ALL_MODES,
        permissionModes: [ChatPermissionMode.supervised],
      },
    });
    await user.click(
      component.getByTestId('ChatPermissionModeControl-trigger'),
    );

    expect(
      component.getByTestId('ChatPermissionModeControl-mode-supervised'),
    ).toBeInTheDocument();
    expect(
      component.queryByTestId('ChatPermissionModeControl-mode-fullAccess'),
    ).not.toBeInTheDocument();
  });

  test('fires onPermissionModeChange with the chosen mode', async () => {
    const onPermissionModeChange = vi.fn();
    const user = userEvent.setup();
    const component = renderControl({ onPermissionModeChange });
    await user.click(
      component.getByTestId('ChatPermissionModeControl-trigger'),
    );
    await user.click(
      component.getByTestId('ChatPermissionModeControl-mode-fullAccess'),
    );

    expect(onPermissionModeChange).toHaveBeenCalledWith(
      ChatPermissionMode.fullAccess,
    );
  });

  test('renders nothing when the backend exposes no permission modes', () => {
    const component = renderControl({
      capabilities: { ...ALL_MODES, permissionModes: [] },
    });

    expect(
      component.queryByTestId('ChatPermissionModeControl-trigger'),
    ).not.toBeInTheDocument();
  });

  describe('remember my choice', () => {
    const openMenu = async (
      overrides: Partial<ChatPermissionModeControlProps>,
    ): Promise<RenderResult> => {
      const user = userEvent.setup();
      const component = renderControl(overrides);
      await user.click(
        component.getByTestId('ChatPermissionModeControl-trigger'),
      );
      return component;
    };

    describe('when no change handler is supplied', () => {
      test('hides the opt-in', async () => {
        const component = await openMenu({});

        expect(
          component.queryByTestId('ChatPermissionModeControl-remember'),
        ).not.toBeInTheDocument();
      });
    });

    describe('when the backend has no elevated mode', () => {
      test('hides the opt-in', async () => {
        const component = await openMenu({
          capabilities: {
            ...ALL_MODES,
            permissionModes: [ChatPermissionMode.supervised],
          },
          onRememberPermissionModeChange: vi.fn(),
        });

        expect(
          component.queryByTestId('ChatPermissionModeControl-remember'),
        ).not.toBeInTheDocument();
      });
    });

    describe('when a handler is supplied and an elevated mode exists', () => {
      test('renders an unchecked checkbox item by default', async () => {
        const component = await openMenu({
          onRememberPermissionModeChange: vi.fn(),
        });

        const item = component.getByTestId(
          'ChatPermissionModeControl-remember',
        );
        expect(item).toHaveAttribute('role', 'menuitemcheckbox');
        expect(item).toHaveAttribute('aria-checked', 'false');
      });

      test('reflects rememberPermissionMode as checked', async () => {
        const component = await openMenu({
          onRememberPermissionModeChange: vi.fn(),
          rememberPermissionMode: true,
        });

        expect(
          component.getByTestId('ChatPermissionModeControl-remember'),
        ).toHaveAttribute('aria-checked', 'true');
      });

      test('fires the handler with the toggled value and keeps the menu open', async () => {
        const onRememberPermissionModeChange = vi.fn();
        const user = userEvent.setup();
        const component = renderControl({ onRememberPermissionModeChange });
        await user.click(
          component.getByTestId('ChatPermissionModeControl-trigger'),
        );
        await user.click(
          component.getByTestId('ChatPermissionModeControl-remember'),
        );

        expect(onRememberPermissionModeChange).toHaveBeenCalledWith(true);
        expect(
          component.getByTestId('ChatPermissionModeControl-mode-fullAccess'),
        ).toBeInTheDocument();
      });
    });
  });
});
