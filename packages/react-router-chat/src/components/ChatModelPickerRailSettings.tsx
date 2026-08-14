import * as React from 'react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { Settings } from 'lucide-react';

export interface ChatModelPickerRailSettingsProps {
  readonly onOpenSettings: () => void;
}

/**
 * @description Bottom-pinned gear entry in the {@link ChatModelPicker} left
 * rail: an icon-only, tooltipped button that invokes {@link onOpenSettings}
 * (the consumer navigates to the agent-setup surface). Mirrors the
 * {@link ChatModelPickerRailItem} affordance for visual consistency.
 *
 * @public
 */
export const ChatModelPickerRailSettings = (
  props: ChatModelPickerRailSettingsProps,
): React.ReactElement => {
  const { onOpenSettings } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Tooltip defaultOpen={false}>
      <TooltipTrigger asChild={true}>
        <Button
          aria-label="Agent setup"
          className="mt-2 size-9 shrink-0"
          data-testid="ChatModelPicker-rail-settings"
          onClick={onOpenSettings}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Settings className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">Agent setup</TooltipContent>
    </Tooltip>
  );
};
