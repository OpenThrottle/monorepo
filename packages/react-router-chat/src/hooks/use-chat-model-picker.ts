import * as React from 'react';
import type { ChatModelGroup, ChatModelOption } from '../types';

/** Id of the synthetic favorites group (the rail's first entry). */
export const FAVORITES_GROUP_ID = '__favorites__';
/** Label for the synthetic favorites group. */
const FAVORITES_GROUP_LABEL = 'Favorites';
/** Id of the synthetic catch-all group for ungrouped models. */
const OTHER_GROUP_ID = '__other__';
/** Fallback group label for models whose `groupId` matches no supplied group. */
const OTHER_GROUP_LABEL = 'Other';

export interface ResolvedGroup {
  readonly icon?: React.ReactNode;
  readonly id: string;
  readonly label: string;
  readonly models: readonly ChatModelOption[];
}

export interface UseChatModelPickerOptions {
  readonly disabledModelIds?: readonly string[];
  readonly groups: readonly ChatModelGroup[];
  readonly models: readonly ChatModelOption[];
  readonly onModelChange: (modelId: string) => void;
  /** Trigger label when nothing is selected. */
  readonly placeholder: string;
  readonly selectedModelId?: string;
}

export interface UseChatModelPickerResult {
  /** Group whose models the right panel currently shows. */
  readonly activeGroup: ResolvedGroup | undefined;
  /** Model ids that are rendered but non-selectable. */
  readonly disabledSet: ReadonlySet<string>;
  readonly onOpenChange: (nextOpen: boolean) => void;
  readonly onSelectModel: (modelId: string) => void;
  readonly onSelectRail: (groupId: string) => void;
  readonly open: boolean;
  /** Favorites + provider groups + catch-all, in display order (empties dropped). */
  readonly resolvedGroups: readonly ResolvedGroup[];
  readonly search: string;
  readonly setSearch: (value: string) => void;
  readonly triggerLabel: string;
  readonly triggerSubLabel: string | undefined;
}

/**
 * @description Owns {@link ChatModelPicker}'s derivation and interaction state:
 * grouping models into the favorites/provider/other rail sections, choosing the
 * group to open on (the selected model's group, else the first), the active
 * group with stale-id fallback, open/search state, and rail/model selection. The
 * picker component stays presentational.
 *
 * @public
 */
export const useChatModelPicker = (
  options: UseChatModelPickerOptions,
): UseChatModelPickerResult => {
  const {
    disabledModelIds,
    groups,
    models,
    onModelChange,
    placeholder,
    selectedModelId,
  } = options;

  const [open, setOpen] = React.useState(false);
  const [activeGroupId, setActiveGroupId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');

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

  return {
    activeGroup,
    disabledSet,
    onOpenChange,
    onSelectModel,
    onSelectRail,
    open,
    resolvedGroups,
    search,
    setSearch,
    triggerLabel: selectedModel?.label ?? placeholder,
    triggerSubLabel: selectedModel?.subLabel,
  };
};
