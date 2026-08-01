import * as React from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { Paperclip } from 'lucide-react';
import type { ChatContextSource } from '../types';

export interface ChatComposerAttachControlProps {
  /** Context sources offered in the menu; an empty list disables the control. */
  readonly contextSources?: readonly ChatContextSource[];
  /** Add a context source; the control renders nothing when omitted. */
  readonly onAddContext?: (sourceId: string) => void;
}

/**
 * @description Attach/add-context control for {@link ChatComposerToolbar}: a
 * paperclip button that opens a menu of {@link ChatContextSource}s, or a
 * disabled button with an explanatory tooltip when no sources are available.
 * Renders nothing when {@link ChatComposerAttachControlProps.onAddContext} is
 * omitted.
 *
 * @public
 */
export const ChatComposerAttachControl = (
  props: ChatComposerAttachControlProps,
): React.ReactElement | null => {
  const { contextSources, onAddContext } = props;

  // Hooks

  // Setup
  const hasContextSources = contextSources != null && contextSources.length > 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (onAddContext == null) {
    return null;
  }

  if (!hasContextSources) {
    return (
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild={true}>
          <Button
            aria-label="Add context"
            data-testid="ChatComposerToolbar-attach"
            disabled={true}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Paperclip className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">No context sources available</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild={true}>
          <DropdownMenuTrigger asChild={true}>
            <Button
              aria-label="Add context"
              data-testid="ChatComposerToolbar-attach"
              size="icon"
              type="button"
              variant="ghost"
            >
              <Paperclip className="size-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">Add context</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start">
        {contextSources.map((source) => (
          <DropdownMenuItem
            key={source.id}
            onSelect={() => onAddContext(source.id)}
          >
            {source.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
