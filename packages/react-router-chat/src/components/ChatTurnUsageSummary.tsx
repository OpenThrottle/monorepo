import * as React from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Markdown,
} from '@openthrottle/react-router-shadcn';
import { ChevronDown } from 'lucide-react';
import { formatJsonPayload } from '../utils/index';
import type { ChatTurnUsageEvent } from '../types';

export interface ChatTurnUsageSummaryProps {
  readonly event: ChatTurnUsageEvent;
}

/** Collapsed token/usage summary from the terminal usage event. */
export const ChatTurnUsageSummary = (
  props: ChatTurnUsageSummaryProps,
): React.ReactElement | null => {
  const { event } = props;

  // Setup
  const usage = formatJsonPayload(event.usageJson);
  const hasError = event.error !== null && event.error.trim() !== '';

  // 🔌 Short Circuit
  if (hasError) {
    return (
      <p className="text-destructive text-xs break-words" role="alert">
        {event.error}
      </p>
    );
  }

  if (usage === null) {
    return null;
  }

  // Markup
  return (
    <Collapsible className="text-muted-foreground" data-testid="ChatTurnUsage">
      <CollapsibleTrigger
        className="flex items-center gap-1 text-[0.7rem] font-medium [&[data-state=open]>svg]:rotate-180"
        data-testid="ChatTurnUsage-trigger"
      >
        <ChevronDown
          aria-hidden="true"
          className="h-3 w-3 shrink-0 transition-transform duration-200"
        />
        <span>Usage</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Markdown
          className="text-[0.7rem] break-words [&_pre]:whitespace-pre-wrap"
          content={usage}
        />
      </CollapsibleContent>
    </Collapsible>
  );
};
