import {
  cn,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

export interface ChatComposerPersistControlProps {
  /** Toggle turn persistence; the control renders nothing when omitted. */
  readonly onPersistChange?: (persist: boolean) => void;
  /** Whether turns are persisted; false is Private (ephemeral) mode. */
  readonly persist?: boolean;
}

/**
 * @description Turn-persistence switch for {@link ChatComposerToolbar}: a Saved
 * ↔ Private toggle with a tooltip explaining that Private turns are not stored.
 * Renders nothing when {@link ChatComposerPersistControlProps.onPersistChange}
 * is omitted. Presentational; the consumer owns the persistence decision.
 *
 * @public
 */
export const ChatComposerPersistControl = (
  props: ChatComposerPersistControlProps,
): React.ReactElement | null => {
  const { onPersistChange, persist = true } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (onPersistChange == null) {
    return null;
  }

  return (
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild={true}>
        <label
          className="flex cursor-pointer items-center gap-1.5 pointer-coarse:min-h-11"
          data-testid="ChatComposerToolbar-persist"
        >
          <Switch
            aria-label="Save conversation"
            checked={persist}
            // The track stays 24x14 so desktop and the visual design are
            // unchanged; on touch an invisible pseudo-element extends the
            // switch's own hit area to 44px tall, matching the label row's
            // min-h-11, so it cannot reach neighbouring toolbar controls.
            className="relative pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-[15px] pointer-coarse:after:content-['']"
            data-testid="ChatComposerToolbar-persist-switch"
            onCheckedChange={onPersistChange}
            size="sm"
          />
          <span
            className={cn(
              'text-xs',
              persist ? 'text-muted-foreground' : 'text-destructive',
            )}
          >
            {persist ? 'Saved' : 'Private'}
          </span>
        </label>
      </TooltipTrigger>
      <TooltipContent side="top">
        {persist
          ? 'Saving — this conversation is stored in your history'
          : 'Private — this conversation is not saved'}
      </TooltipContent>
    </Tooltip>
  );
};
