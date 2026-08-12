import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test, vi } from 'vitest';
import { ChatComposerMicControl } from '../ChatComposerMicControl';
import type { ChatComposerMicControlProps } from '../ChatComposerMicControl';
import { ChatComposerMicState } from '../../types';

const renderControl = (props: ChatComposerMicControlProps): RenderResult =>
  render(
    <TooltipProvider>
      <ChatComposerMicControl {...props} />
    </TooltipProvider>,
  );

describe('ChatComposerMicControl Component', () => {
  test('renders nothing when no onMicToggle callback is supplied', () => {
    const component = renderControl({ micState: ChatComposerMicState.idle });

    expect(
      component.queryByTestId('ChatComposerToolbar-mic'),
    ).not.toBeInTheDocument();
  });

  test('renders idle and fires onMicToggle on click', async () => {
    const onMicToggle = vi.fn();
    const component = renderControl({
      micState: ChatComposerMicState.idle,
      onMicToggle,
    });

    const mic = component.getByTestId('ChatComposerToolbar-mic');
    expect(mic).toHaveAttribute('aria-label', 'Start voice input');
    expect(mic).toHaveAttribute('aria-pressed', 'false');
    expect(mic).not.toBeDisabled();

    const user = userEvent.setup();
    await user.click(mic);

    expect(onMicToggle).toHaveBeenCalledTimes(1);
  });

  test('reflects the recording state with a pressed, pulsing affordance', () => {
    const component = renderControl({
      micState: ChatComposerMicState.recording,
      onMicToggle: vi.fn(),
    });

    const mic = component.getByTestId('ChatComposerToolbar-mic');
    expect(mic).toHaveAttribute('aria-label', 'Stop voice input');
    expect(mic).toHaveAttribute('aria-pressed', 'true');
    expect(mic).toHaveAttribute('data-mic-state', 'recording');
    expect(mic.querySelector('.animate-pulse')).not.toBeNull();
  });

  test('disables the control while finalizing with a spinner', () => {
    const component = renderControl({
      micState: ChatComposerMicState.finalizing,
      onMicToggle: vi.fn(),
    });

    const mic = component.getByTestId('ChatComposerToolbar-mic');
    expect(mic).toBeDisabled();
    expect(mic).toHaveAttribute('aria-label', 'Transcribing…');
    expect(mic.querySelector('.animate-spin')).not.toBeNull();
  });

  test('disables the control when voice input is unavailable', () => {
    const component = renderControl({
      micState: ChatComposerMicState.disabled,
      onMicToggle: vi.fn(),
    });

    const mic = component.getByTestId('ChatComposerToolbar-mic');
    expect(mic).toBeDisabled();
    expect(mic).toHaveAttribute('aria-label', 'Voice input unavailable');
  });
});
