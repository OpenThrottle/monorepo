import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test, vi } from 'vitest';

import type { ChatBackendCapabilities } from '../../types';
import { CHAT_REASONING_LEVEL, CHAT_SERVICE_TIER } from '../../types';
import type { ChatReasoningTierControlProps } from '../ChatReasoningTierControl';
import { ChatReasoningTierControl } from '../ChatReasoningTierControl';

const FULL_CAPS: ChatBackendCapabilities = {
  maxRepositories: 1,
  permissionModes: [],
  reasoningLevels: [
    CHAT_REASONING_LEVEL.low,
    CHAT_REASONING_LEVEL.medium,
    CHAT_REASONING_LEVEL.high,
  ],
  requiresRepository: false,
  serviceTiers: [CHAT_SERVICE_TIER.standard, CHAT_SERVICE_TIER.fast],
  supervisedGatesEdits: true,
  supportsModelFlag: true,
};

const renderControl = (
  overrides: Partial<ChatReasoningTierControlProps> = {},
): RenderResult => {
  return render(
    <ChatReasoningTierControl
      capabilities={FULL_CAPS}
      reasoning={CHAT_REASONING_LEVEL.low}
      serviceTier={CHAT_SERVICE_TIER.standard}
      {...overrides}
    />,
  );
};

describe('ChatReasoningTierControl Component', () => {
  test('reflects the current reasoning · tier on the trigger', () => {
    const component = renderControl();

    expect(
      component.getByTestId('ChatReasoningTierControl-trigger'),
    ).toHaveTextContent('Low · Standard');
  });

  test('renders only capability-allowed reasoning + tier options', async () => {
    const user = userEvent.setup();
    const component = renderControl();
    await user.click(component.getByTestId('ChatReasoningTierControl-trigger'));

    expect(
      component.getByTestId('ChatReasoningTierControl-reasoning-high'),
    ).toBeInTheDocument();
    // extraHigh is not in the backend's reasoningLevels.
    expect(
      component.queryByTestId('ChatReasoningTierControl-reasoning-extraHigh'),
    ).not.toBeInTheDocument();
    expect(
      component.getByTestId('ChatReasoningTierControl-tier-fast'),
    ).toBeInTheDocument();
  });

  test('fires onReasoningChange with the chosen level', async () => {
    const onReasoningChange = vi.fn();
    const user = userEvent.setup();
    const component = renderControl({ onReasoningChange });
    await user.click(component.getByTestId('ChatReasoningTierControl-trigger'));
    await user.click(
      component.getByTestId('ChatReasoningTierControl-reasoning-high'),
    );

    expect(onReasoningChange).toHaveBeenCalledWith(CHAT_REASONING_LEVEL.high);
  });

  test('fires onServiceTierChange with the chosen tier', async () => {
    const onServiceTierChange = vi.fn();
    const user = userEvent.setup();
    const component = renderControl({ onServiceTierChange });
    await user.click(component.getByTestId('ChatReasoningTierControl-trigger'));
    await user.click(
      component.getByTestId('ChatReasoningTierControl-tier-fast'),
    );

    expect(onServiceTierChange).toHaveBeenCalledWith(CHAT_SERVICE_TIER.fast);
  });

  test('hides the tier section when the backend exposes no tiers', async () => {
    const user = userEvent.setup();
    const component = renderControl({
      capabilities: { ...FULL_CAPS, serviceTiers: [] },
    });
    await user.click(component.getByTestId('ChatReasoningTierControl-trigger'));

    expect(
      component.queryByTestId('ChatReasoningTierControl-tier-standard'),
    ).not.toBeInTheDocument();
    expect(
      component.getByTestId('ChatReasoningTierControl-trigger'),
    ).toHaveTextContent('Low');
  });

  test('renders nothing when the backend exposes neither reasoning nor tiers', () => {
    const component = renderControl({
      capabilities: {
        ...FULL_CAPS,
        reasoningLevels: [],
        serviceTiers: [],
      },
    });

    expect(
      component.queryByTestId('ChatReasoningTierControl-trigger'),
    ).not.toBeInTheDocument();
  });
});
