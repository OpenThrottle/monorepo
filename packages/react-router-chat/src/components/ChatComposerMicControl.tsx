import * as React from 'react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { Loader2, Mic } from 'lucide-react';
import clsx from 'clsx';
import { ChatComposerMicState } from '../types';

export interface ChatComposerMicControlProps {
  readonly micState: ChatComposerMicState;
  /** Toggle voice input (click starts / click stops); omit to hide the control. */
  readonly onMicToggle?: () => void;
}

/**
 * @description Toggle-only voice-input mic for {@link ChatComposerToolbar}. Its
 * icon, label, pressed/disabled state, and pulsing/spinner affordance are driven
 * by {@link ChatComposerMicState} (idle / recording / finalizing / disabled).
 * Renders nothing when {@link ChatComposerMicControlProps.onMicToggle} is
 * omitted. Presentational — the consumer owns all capture and transcription.
 *
 * @public
 */
export const ChatComposerMicControl = (
  props: ChatComposerMicControlProps,
): React.ReactElement | null => {
  const { micState, onMicToggle } = props;

  // Hooks

  // Setup
  const isMicFinalizing = micState === ChatComposerMicState.finalizing;
  const isMicRecording = micState === ChatComposerMicState.recording;
  const micLabel = isMicRecording
    ? 'Stop voice input'
    : isMicFinalizing
      ? 'Transcribing…'
      : micState === ChatComposerMicState.disabled
        ? 'Voice input unavailable'
        : 'Start voice input';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (onMicToggle == null) {
    return null;
  }

  return (
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild={true}>
        <Button
          aria-label={micLabel}
          aria-pressed={isMicRecording}
          className={clsx({
            'text-destructive hover:text-destructive': isMicRecording,
          })}
          data-mic-state={micState}
          data-testid="ChatComposerToolbar-mic"
          disabled={
            micState === ChatComposerMicState.disabled || isMicFinalizing
          }
          onClick={onMicToggle}
          size="icon"
          type="button"
          variant="ghost"
        >
          {isMicFinalizing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Mic
              className={clsx('size-4', {
                'animate-pulse': isMicRecording,
              })}
            />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{micLabel}</TooltipContent>
    </Tooltip>
  );
};
