import * as React from 'react';
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  Popover,
  PopoverContent,
  PopoverTrigger,
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

/** Label for the synthetic favorites group. */
const FAVORITES_GROUP_LABEL = 'Favorites';
/** Fallback group label for models whose `groupId` matches no supplied group. */
const OTHER_GROUP_LABEL = 'Other';

interface ResolvedGroup {
  readonly icon?: React.ReactNode;
  readonly id: string;
  readonly label: string;
  readonly models: readonly ChatModelOption[];
}

/**
 * @description Controlled, presentational command-palette model/CLI picker.
 * Renders a searchable list grouped by provider/CLI (plus a synthetic
 * Favorites group), each row carrying an optional muted sub-label, a keyboard
 * shortcut hint, and an optional favorite toggle. Selection and favoriting are
 * driven entirely by props — the package hardcodes no models. Capability
 * gating (which rows are selectable) is expressed via {@link disabledModelIds}.
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
        id: '__favorites__',
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
        id: '__other__',
        label: OTHER_GROUP_LABEL,
        models: ungrouped,
      });
    }

    return out;
  }, [groups, models]);

  const triggerLabel = selectedModel?.label ?? placeholder;
  const triggerSubLabel = selectedModel?.subLabel;

  // Handlers
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
  const renderRow = (
    model: ChatModelOption,
    groupId: string,
  ): React.ReactElement => {
    const isSelected = model.id === selectedModelId;
    const isDisabled = disabledSet.has(model.id);

    return (
      <CommandItem
        aria-disabled={isDisabled}
        className="gap-2"
        data-testid={`ChatModelPicker-option-${groupId}-${model.id}`}
        disabled={isDisabled}
        // Namespaced with the group id so the same model surfaced under both
        // Favorites and its provider group stays keyboard-navigable + unique.
        key={`${groupId}:${model.id}`}
        keywords={[model.label, model.subLabel ?? '', model.description ?? '']}
        onSelect={() => onSelectModel(model.id)}
        value={`${model.label} ${model.subLabel ?? ''} ${model.id}`}
      >
        <Check
          className={clsx(
            'size-4 shrink-0',
            isSelected ? 'opacity-100' : 'opacity-0',
          )}
        />
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{model.label}</span>
          {model.subLabel != null && model.subLabel !== '' ? (
            <span className="text-muted-foreground truncate text-xs">
              {model.subLabel}
            </span>
          ) : null}
        </span>
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
    <Popover onOpenChange={setOpen} open={open}>
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
        className="w-72 p-0"
        data-testid="ChatModelPicker-content"
      >
        <Command>
          <CommandInput
            data-testid="ChatModelPicker-search"
            placeholder={searchPlaceholder}
          />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            {resolvedGroups.map((group) => (
              <CommandGroup
                data-testid={`ChatModelPicker-group-${group.id}`}
                heading={
                  group.icon != null ? (
                    <span className="flex items-center gap-1.5">
                      {group.icon}
                      {group.label}
                    </span>
                  ) : (
                    group.label
                  )
                }
                key={group.id}
              >
                {group.models.map((model) => renderRow(model, group.id))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
