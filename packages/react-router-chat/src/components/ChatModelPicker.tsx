import * as React from 'react';
import {
  Button,
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { Check, ChevronsUpDown, Star } from 'lucide-react';
import clsx from 'clsx';
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
   * Toggle a model's favorite flag. Omit to hide the star affordance entirely
   * (favorites still render in their own group when `favorite` is set).
   */
  readonly onToggleFavorite?: (modelId: string) => void;
  readonly placeholder?: string;
  /** Search-input placeholder. */
  readonly searchPlaceholder?: string;
  readonly selectedModelId?: string;
}

/** Id of the synthetic favorites group (the rail's first entry). */
const FAVORITES_GROUP_ID = '__favorites__';
/** Label for the synthetic favorites group. */
const FAVORITES_GROUP_LABEL = 'Favorites';
/** Id of the synthetic catch-all group for ungrouped models. */
const OTHER_GROUP_ID = '__other__';
/** Fallback group label for models whose `groupId` matches no supplied group. */
const OTHER_GROUP_LABEL = 'Other';

interface ResolvedGroup {
  readonly icon?: React.ReactNode;
  readonly id: string;
  readonly label: string;
  readonly models: readonly ChatModelOption[];
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
    onToggleFavorite,
    placeholder = 'Select model',
    searchPlaceholder = 'Search models…',
    selectedModelId,
  } = props;

  // Hooks
  const [open, setOpen] = React.useState(false);
  const [activeGroupId, setActiveGroupId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');

  // Setup
  const disabledSet = React.useMemo(
    () => new Set(disabledModelIds ?? []),
    [disabledModelIds],
  );

  const selectedModel = React.useMemo(
    () => models.find((model) => model.id === selectedModelId),
    [models, selectedModelId],
  );

  const resolvedGroups = React.useMemo<readonly ResolvedGroup[]>(() => {
    const out: ResolvedGroup[] = [];

    const favorites = models.filter((model) => model.favorite === true);
    if (favorites.length > 0) {
      out.push({
        id: FAVORITES_GROUP_ID,
        label: FAVORITES_GROUP_LABEL,
        models: favorites,
      });
    }

    for (const group of groups) {
      const groupModels = models.filter((model) => model.groupId === group.id);
      if (groupModels.length > 0) {
        out.push({
          icon: group.icon,
          id: group.id,
          label: group.label,
          models: groupModels,
        });
      }
    }

    const knownGroupIds = new Set(groups.map((group) => group.id));
    const ungrouped = models.filter(
      (model) => model.groupId == null || !knownGroupIds.has(model.groupId),
    );
    if (ungrouped.length > 0) {
      out.push({
        id: OTHER_GROUP_ID,
        label: OTHER_GROUP_LABEL,
        models: ungrouped,
      });
    }

    return out;
  }, [groups, models]);

  // The rail entry to open on. Prefer the selected model's group (its Favorites
  // entry when it is favorited), else the first resolved group.
  const defaultActiveGroupId = React.useMemo<string | null>(() => {
    if (resolvedGroups.length === 0) {
      return null;
    }
    if (selectedModel != null) {
      if (
        selectedModel.favorite === true &&
        resolvedGroups.some((group) => group.id === FAVORITES_GROUP_ID)
      ) {
        return FAVORITES_GROUP_ID;
      }
      const owning = resolvedGroups.find(
        (group) =>
          group.id !== FAVORITES_GROUP_ID &&
          group.models.some((model) => model.id === selectedModel.id),
      );
      if (owning != null) {
        return owning.id;
      }
    }
    return resolvedGroups[0].id;
  }, [resolvedGroups, selectedModel]);

  // The active group falls back to the default (and then the first group) so a
  // stale `activeGroupId` — e.g. after `models` changes — never blanks the list.
  const activeGroup =
    resolvedGroups.find((group) => group.id === activeGroupId) ??
    resolvedGroups.find((group) => group.id === defaultActiveGroupId) ??
    resolvedGroups[0];

  const triggerLabel = selectedModel?.label ?? placeholder;
  const triggerSubLabel = selectedModel?.subLabel;

  // Handlers
  const onOpenChange = (nextOpen: boolean): void => {
    if (nextOpen) {
      // Reopen onto the selected model's group with a cleared search.
      setActiveGroupId(defaultActiveGroupId);
      setSearch('');
    }

    setOpen(nextOpen);
  };

  const onSelectRail = (groupId: string): void => {
    setActiveGroupId(groupId);
    // Search filters within the active group only, so switching resets it.
    setSearch('');
  };

  const onSelectModel = (modelId: string): void => {
    if (disabledSet.has(modelId)) {
      return;
    }

    onModelChange(modelId);
    setOpen(false);
  };

  const onFavoriteClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    modelId: string,
  ): void => {
    // Keep the row's onSelect from firing when the star is clicked.
    event.preventDefault();
    event.stopPropagation();

    onToggleFavorite?.(modelId);
  };

  // Markup
  const renderRailIcon = (group: ResolvedGroup): React.ReactElement => {
    if (group.id === FAVORITES_GROUP_ID) {
      return <Star className="size-4" />;
    }

    if (group.icon != null) {
      return (
        <span className="flex size-4 items-center justify-center">
          {group.icon}
        </span>
      );
    }

    // Letter-avatar fallback for a group that supplied no icon.
    return (
      <span
        aria-hidden={true}
        className="flex size-4 items-center justify-center text-xs font-medium"
      >
        {group.label.charAt(0).toUpperCase()}
      </span>
    );
  };

  const renderRailItem = (
    group: ResolvedGroup,
    index: number,
  ): React.ReactElement => {
    const isActive = activeGroup?.id === group.id;

    return (
      <Tooltip defaultOpen={false} key={`${group.id}-${index}`}>
        <TooltipTrigger asChild={true}>
          <Button
            aria-label={group.label}
            aria-pressed={isActive}
            className={clsx(
              'relative size-9 shrink-0',
              isActive &&
                'bg-accent text-accent-foreground before:bg-primary before:absolute before:top-1/2 before:left-0 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:content-[""]',
            )}
            data-active={isActive}
            data-testid={`ChatModelPicker-rail-item-${group.id}`}
            onClick={() => onSelectRail(group.id)}
            size="icon"
            type="button"
            variant="ghost"
          >
            {renderRailIcon(group)}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{group.label}</TooltipContent>
      </Tooltip>
    );
  };

  const renderRow = (
    model: ChatModelOption,
    groupId: string,
  ): React.ReactElement => {
    const isSelected = model.id === selectedModelId;
    const isDisabled = disabledSet.has(model.id);

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
        onSelect={() => onSelectModel(model.id)}
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
            onClick={(event) => onFavoriteClick(event, model.id)}
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
          <CommandShortcut
            className={onToggleFavorite != null ? '' : 'ml-auto'}
          >
            {model.shortcut}
          </CommandShortcut>
        ) : null}
      </CommandItem>
    );
  };

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
          className="bg-muted/40 flex max-h-80 flex-col gap-1 overflow-y-auto border-r p-1.5"
          data-testid="ChatModelPicker-rail"
        >
          {resolvedGroups.map((group) => renderRailItem(group))}
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
              ? activeGroup.models.map((model) =>
                  renderRow(model, activeGroup.id),
                )
              : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
