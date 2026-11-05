import {
  Button,
  cn,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { Star } from 'lucide-react';
import * as React from 'react';

import { FAVORITES_GROUP_ID } from '../data/data.chat-model-picker-favorites';
import type { ResolvedGroup } from '../types';

export interface ChatModelPickerRailItemProps {
  readonly group: ResolvedGroup;
  /** Disambiguates the key/testid when the same group id repeats. */
  readonly index: number;
  readonly isActive: boolean;
  readonly onSelect: (groupId: string) => void;
}

/**
 * @description One left-rail entry in {@link ChatModelPicker}: an icon-only,
 * tooltipped button for a provider/CLI group (or the synthetic Favorites entry).
 * Falls back to a star for Favorites, the group's icon when supplied, else a
 * letter avatar. Shows an active indicator when selected.
 *
 * @public
 */
export const ChatModelPickerRailItem = (
  props: ChatModelPickerRailItemProps,
): React.ReactElement => {
  const { group, index, isActive, onSelect } = props;

  // Hooks

  // Setup
  const isFavorites = group.id === FAVORITES_GROUP_ID;
  const hasGroupIcon = !isFavorites && group.icon != null;
  const hasLetterIcon = !isFavorites && group.icon == null;

  // Handlers

  // Markup
  const starIcon = <Star className="size-4" />;

  const groupIcon = (
    <span className="flex size-4 items-center justify-center">
      {group.icon}
    </span>
  );

  // Letter-avatar fallback for a group that supplied no icon.
  const letterIcon = (
    <span
      aria-hidden={true}
      className="flex size-4 items-center justify-center text-xs font-medium"
    >
      {group.label.charAt(0).toUpperCase()}
    </span>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Tooltip defaultOpen={false} key={`${group.id}-${index}`}>
      <TooltipTrigger asChild={true}>
        <Button
          aria-label={group.label}
          aria-pressed={isActive}
          className={cn(
            'relative size-9 shrink-0',
            isActive &&
              'bg-accent text-accent-foreground before:bg-primary before:absolute before:top-1/2 before:left-0 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:content-[""]',
          )}
          data-active={isActive}
          data-testid={`ChatModelPicker-rail-item-${group.id}`}
          onClick={() => onSelect(group.id)}
          size="icon"
          type="button"
          variant="ghost"
        >
          {isFavorites && starIcon}
          {hasGroupIcon && groupIcon}
          {hasLetterIcon && letterIcon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{group.label}</TooltipContent>
    </Tooltip>
  );
};
