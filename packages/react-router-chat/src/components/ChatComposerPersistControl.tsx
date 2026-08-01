import * as React from 'react';
import {
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';

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
          className="flex cursor-pointer items-center gap-1.5"
          data-testid="ChatComposerToolbar-persist"
        >
          <Switch
            aria-label="Save conversation"
            checked={persist}
            data-testid="ChatComposerToolbar-persist-switch"
            onCheckedChange={onPersistChange}
            size="sm"
          />
          <span
            className={clsx(
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
