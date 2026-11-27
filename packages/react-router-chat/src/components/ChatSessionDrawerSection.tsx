import {
  Button,
  cn,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@openthrottle/react-router-shadcn';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import { CHAT_PANEL_HOVER_CLASSES } from '../data/chat-panel.classes';
import { CHAT_SESSION_DRAWER_COPY } from '../data/copy';

export interface ChatSessionDrawerSectionProps {
  readonly children: React.ReactNode;
  /** Whether the body is hidden; the title row always stays. */
  readonly isCollapsed: boolean;
  readonly onToggle: () => void;
  /** Stable section id (see CHAT_SESSION_DRAWER_SECTIONS); keys the test ids. */
  readonly sectionId: string;
  readonly title: string;
}

/**
 * @description The frame every session drawer section shares: a title row that
 * collapses its body. Controlled — the drawer's consumer owns which sections
 * are collapsed, so the choice can be persisted.
 *
 * @public
 */
export const ChatSessionDrawerSection = (
  props: ChatSessionDrawerSectionProps,
): React.ReactElement => {
  const { children, isCollapsed, onToggle, sectionId, title } = props;

  // Hooks

  // Setup
  const copy = CHAT_SESSION_DRAWER_COPY;
  const toggleLabel = isCollapsed ? copy.expandSection : copy.collapseSection;

  // Handlers
  const handleOpenChange = (): void => {
    onToggle();
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Collapsible
      className="border-b last:border-b-0"
      data-testid={`ChatSessionDrawerSection-${sectionId}`}
      onOpenChange={handleOpenChange}
      open={!isCollapsed}
    >
      <CollapsibleTrigger asChild={true}>
        <Button
          aria-label={`${toggleLabel}: ${title}`}
          className={cn(
            'h-9 w-full justify-between rounded-none px-4 text-xs font-medium',
            CHAT_PANEL_HOVER_CLASSES,
          )}
          data-testid={`ChatSessionDrawerSection-${sectionId}-toggle`}
          type="button"
          variant="ghost"
        >
          {title}
          <ChevronDown
            aria-hidden={true}
            className={cn(
              'size-4 transition-transform',
              isCollapsed && '-rotate-90',
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
};
