import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { ChatPermissionModeControl } from '../ChatPermissionModeControl';
import type { ChatPermissionModeControlProps } from '../ChatPermissionModeControl';
import { ChatPermissionMode } from '../../types';
import type { ChatBackendCapabilities } from '../../types';

const ALL_MODES: ChatBackendCapabilities = {
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
): RenderResult =>
  render(
    <ChatPermissionModeControl
      capabilities={ALL_MODES}
      permissionMode={ChatPermissionMode.supervised}
      {...overrides}
    />,
  );

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
});
