import * as React from 'react';
import clsx from 'clsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Markdown,
} from '@openthrottle/react-router-shadcn';
import { ChevronDown } from 'lucide-react';

export interface ChatThinkingBlockProps {
  /** Whether the reasoning starts expanded. Collapsed by default. */
  readonly defaultOpen?: boolean;
  /** Accumulated reasoning text; grows live as thinking deltas arrive. */
  readonly text: string;
}

const THINKING_LABEL = 'Thinking';

/**
 * @description Collapsible reasoning block for an assistant turn. Renders a
 * subdued, scratchpad-style 'Thinking' affordance that expands to the agent's
 * reasoning. Collapsed by default; streams live (the `text` prop grows as
 * thinking deltas arrive). Empty/whitespace reasoning produces no block.
 *
 * Reasoning is untrusted model output and is rendered through {@link Markdown}
 * as escaped preformatted text (never injected as live DOM) — same XSS-safe
 * path as {@link ChatMessageBody}.
 *
 * @public
 */
export const ChatThinkingBlock = (
  props: ChatThinkingBlockProps,
): React.ReactElement | null => {
  const { defaultOpen = false, text } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (text.trim() === '') {
    return null;
  }

  return (
    <Collapsible
      className="border-border/50 text-muted-foreground my-1 rounded-md border border-dashed"
      data-testid="ChatThinkingBlock"
      defaultOpen={defaultOpen}
    >
      <CollapsibleTrigger
        className="flex w-full items-center gap-1.5 px-2 py-1 text-xs font-medium [&[data-state=open]>svg]:rotate-180"
        data-testid="ChatThinkingBlock-trigger"
      >
        <ChevronDown
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
        />
        <span>{THINKING_LABEL}</span>
      </CollapsibleTrigger>
      <CollapsibleContent
        className="max-h-64 overflow-auto px-2 pb-2"
        data-testid="ChatThinkingBlock-content"
      >
        <Markdown
          className={clsx(
            'text-muted-foreground text-xs break-words italic',
            '[&_pre]:whitespace-pre-wrap',
          )}
          content={text}
        />
      </CollapsibleContent>
    </Collapsible>
  );
};
