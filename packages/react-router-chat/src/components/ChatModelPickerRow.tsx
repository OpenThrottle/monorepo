import * as React from 'react';
import {
  CommandItem,
  CommandShortcut,
} from '@openthrottle/react-router-shadcn';
import { Check, Star } from 'lucide-react';
import clsx from 'clsx';
import type { ChatModelOption } from '../types';

export interface ChatModelPickerRowProps {
  /** The owning group's id; namespaces the key/testid so a model can repeat. */
  readonly groupId: string;
  readonly isDisabled: boolean;
  readonly isSelected: boolean;
  readonly model: ChatModelOption;
  readonly onSelect: (modelId: string) => void;
  /** Toggle the model's favorite flag; omit to hide the star affordance. */
  readonly onToggleFavorite?: (modelId: string) => void;
}

/**
 * @description One selectable model row in {@link ChatModelPicker}'s right
 * panel: label + optional muted sub-label, a selected check, an optional
 * favorite star toggle, and an optional `⌘N` shortcut hint. Disabled rows render
 * but are non-selectable.
 *
 * @public
 */
export const ChatModelPickerRow = (
  props: ChatModelPickerRowProps,
): React.ReactElement => {
  const { groupId, isDisabled, isSelected, model, onSelect, onToggleFavorite } =
    props;

  // Hooks

  // Setup

  // Handlers
  const onFavoriteClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    // Keep the row's onSelect from firing when the star is clicked.
    event.preventDefault();
    event.stopPropagation();

    onToggleFavorite?.(model.id);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <CommandItem
      aria-disabled={isDisabled}
      className="flex justify-between !gap-4 md:!gap-8"
      data-testid={`ChatModelPicker-option-${groupId}-${model.id}`}
      disabled={isDisabled}
      // Namespaced with the group id so the same model surfaced under both
      // Favorites and its provider group stays keyboard-navigable + unique.
      key={`${groupId}:${model.id}`}
      keywords={[model.label, model.subLabel ?? '', model.description ?? '']}
      onSelect={() => onSelect(model.id)}
      value={`${model.label} ${model.subLabel ?? ''} ${model.id}`}
    >
      <div className="flex min-w-0 flex-col">
        <span className="truncate">{model.label}</span>
        {model.subLabel != null && model.subLabel !== '' ? (
          <span className="text-muted-foreground truncate text-xs">
            {model.subLabel}
          </span>
        ) : null}
      </div>
      <Check
        className={clsx(
          'size-4 shrink-0',
          isSelected ? 'opacity-100' : 'opacity-0',
        )}
      />

      {onToggleFavorite != null ? (
        <button
          aria-label={
            model.favorite === true
              ? `Unfavorite ${model.label}`
              : `Favorite ${model.label}`
          }
          aria-pressed={model.favorite === true}
          className="ml-auto shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
          data-testid={`ChatModelPicker-favorite-${groupId}-${model.id}`}
          onClick={onFavoriteClick}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          <Star
            className={clsx(
              'size-3.5',
              model.favorite === true && 'fill-current',
            )}
          />
        </button>
      ) : null}
      {model.shortcut != null && model.shortcut !== '' ? (
        <CommandShortcut className={onToggleFavorite != null ? '' : 'ml-auto'}>
          {model.shortcut}
        </CommandShortcut>
      ) : null}
    </CommandItem>
  );
};
