import * as React from 'react';
import { CommandShortcut } from '@openthrottle/react-router-shadcn';

export interface CommanderFooterProps {
  /**
   * Optional left-aligned hint (e.g. UUID / queue-job paste behavior).
   */
  readonly footerHint?: string;
}

/**
 * @description Keyboard-hint footer for the command palette dialog.
 * @see ./OpenThrottleCommander.tsx
 */
export const CommanderFooter = (
  props: CommanderFooterProps,
): React.ReactElement => {
  const { footerHint } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="border-border text-muted-foreground flex items-center justify-between gap-4 border-t px-2 py-2 text-[10px]"
      data-testid="CommanderFooter"
    >
      {footerHint ? (
        <span className="line-clamp-2 max-w-[min(100%,18rem)] text-left leading-snug">
          {footerHint}
        </span>
      ) : (
        <span />
      )}
      <div className="flex shrink-0 items-center justify-end gap-4">
        <div className="flex items-center gap-1.5">
          <CommandShortcut className="border-muted-foreground flex w-auto items-center border text-[8px]! whitespace-nowrap">
            ↑↓
          </CommandShortcut>
          <span className="font-regular">navigate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CommandShortcut className="border-muted-foreground flex w-auto items-center border text-[8px]! whitespace-nowrap">
            ↵
          </CommandShortcut>
          <span className="font-regular">select</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CommandShortcut className="border-muted-foreground flex w-auto items-center border text-[8px]! whitespace-nowrap">
            esc
          </CommandShortcut>
          <span className="font-regular">close</span>
        </div>
      </div>
    </div>
  );
};
