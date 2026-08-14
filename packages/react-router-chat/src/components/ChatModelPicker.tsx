import * as React from 'react';
import {
  Button,
  Command,
  CommandEmpty,
  CommandInput,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@openthrottle/react-router-shadcn';
import { ChevronsUpDown } from 'lucide-react';
import clsx from 'clsx';
import { ChatModelPickerRailItem } from './ChatModelPickerRailItem';
import { ChatModelPickerRailSettings } from './ChatModelPickerRailSettings';
import { ChatModelPickerRow } from './ChatModelPickerRow';
import { useChatModelPicker } from '../hooks/use-chat-model-picker';
import type { ChatModelGroup, ChatModelOption } from '../types';

export interface ChatModelPickerProps {
  /** Popover alignment against the trigger. */
  readonly align?: 'center' | 'end' | 'start';
  readonly className?: string;
  /**
   * Model ids the caller has gated off (e.g. the selected backend can't run
   * them). Rendered but non-selectable. Presentational — the caller decides.
   */
  readonly disabledModelIds?: readonly string[];
  /** Empty-state copy when the search matches nothing. */
  readonly emptyLabel?: string;
  /**
   * Provider/CLI groups (the picker's rail sections), in display order. A model
   * is placed under the group whose `id` equals its `groupId`.
   */
  readonly groups: readonly ChatModelGroup[];
  readonly models: readonly ChatModelOption[];
  readonly onModelChange: (modelId: string) => void;
  /**
   * Open the agent-setup surface. When provided, a gear button pins to the
   * bottom of the left rail (below the agent selections). Omit to hide it.
   * Presentational — the consumer supplies the navigation.
   */
  readonly onOpenSettings?: () => void;
  /**
   * Toggle a model's favorite flag. Omit to hide the star affordance entirely
   * (favorites still render in their own group when `favorite` is set).
   */
  readonly onToggleFavorite?: (modelId: string) => void;
  readonly placeholder?: string;
  /** Search-input placeholder. */
  readonly searchPlaceholder?: string;
  readonly selectedModelId?: string;
}

/**
 * @description Controlled, presentational command-palette model/CLI picker with
 * a two-column layout: a thin, icon-only left rail lists a synthetic
 * {@link FAVORITES_GROUP_LABEL} entry (when any model is favorited) followed by
 * one entry per provider/CLI group, each an icon with a hover tooltip and an
 * active state; the right panel is a searchable, scrolling list showing only the
 * active group's models (label, optional muted sub-label, `⌘N` shortcut hint,
 * optional favorite toggle, selected check). Search filters within the active
 * group only. Selection, favoriting, and content are driven entirely by props —
 * the package hardcodes no models. Capability gating (which rows are selectable)
 * is expressed via {@link disabledModelIds}.
 *
 * @public
 */
export const ChatModelPicker = (
  props: ChatModelPickerProps,
): React.ReactElement => {
  const {
    align = 'start',
    className,
    disabledModelIds,
    emptyLabel = 'No models found.',
    groups,
    models,
    onModelChange,
    onOpenSettings,
    onToggleFavorite,
    placeholder = 'Select model',
    searchPlaceholder = 'Search models…',
    selectedModelId,
  } = props;

  // Hooks
  const {
    activeGroup,
    disabledSet,
    onOpenChange,
    onSelectModel,
    onSelectRail,
    open,
    resolvedGroups,
    search,
    setSearch,
    triggerLabel,
    triggerSubLabel,
  } = useChatModelPicker({
    disabledModelIds,
    groups,
    models,
    onModelChange,
    placeholder,
    selectedModelId,
  });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Popover onOpenChange={onOpenChange} open={open}>
      <PopoverTrigger asChild={true}>
        <Button
          aria-expanded={open}
          aria-label="Model"
          className={clsx(
            'h-8 w-auto min-w-40 justify-between gap-2',
            className,
          )}
          data-testid="ChatModelPicker-trigger"
          role="combobox"
          type="button"
          variant="outline"
        >
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate">{triggerLabel}</span>
            {triggerSubLabel != null && triggerSubLabel !== '' ? (
              <span className="text-muted-foreground truncate text-xs">
                {triggerSubLabel}
              </span>
            ) : null}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="flex w-96 p-0"
        data-testid="ChatModelPicker-content"
      >
        <div
          className="bg-muted/40 --max-h-80 flex flex-col gap-1 border-r p-1.5"
          data-testid="ChatModelPicker-rail"
        >
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {resolvedGroups.map((group, index) => (
              <ChatModelPickerRailItem
                group={group}
                index={index}
                isActive={activeGroup?.id === group.id}
                key={`${group.id}-${index}`}
                onSelect={onSelectRail}
              />
            ))}
          </div>
          {onOpenSettings != null ? (
            <ChatModelPickerRailSettings onOpenSettings={onOpenSettings} />
          ) : null}
        </div>
        <Command className="min-w-0 flex-1" shouldFilter={true}>
          <CommandInput
            className="mb-3 px-2 py-0.5 text-sm placeholder:text-sm"
            data-testid="ChatModelPicker-search"
            onValueChange={setSearch}
            placeholder={searchPlaceholder}
            value={search}
          />
          <CommandList className="max-h-72">
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            {activeGroup != null
              ? activeGroup.models.map((model) => (
                  <ChatModelPickerRow
                    groupId={activeGroup.id}
                    isDisabled={disabledSet.has(model.id)}
                    isSelected={model.id === selectedModelId}
                    key={`${activeGroup.id}:${model.id}`}
                    model={model}
                    onSelect={onSelectModel}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))
              : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
