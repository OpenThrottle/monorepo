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
  /**
   * How many of the group's models are hidden behind the collapsed shortlist.
   * `0` whenever the group is showing everything it has — which is every group
   * that flags no model as `shortlist`, and any group once the user searches.
   */
  readonly hiddenCount: number;
  readonly icon?: React.ReactNode;
  readonly id: string;
  readonly label: string;
  /** The models to RENDER — the shortlist while collapsed, else all of them. */
  readonly models: readonly ChatModelOption[];
}

/**
 * Collapse a group to its shortlist while the search box is empty. A group that
 * flags no model is returned untouched, so this is inert for every group that
 * predates the shortlist (local endpoints, agent CLIs).
 */
function applyShortlist(
  models: readonly ChatModelOption[],
  isSearching: boolean,
  selectedModelId: string | undefined,
): { hiddenCount: number; models: readonly ChatModelOption[] } {
  if (isSearching) {
    return { hiddenCount: 0, models };
  }

  // The SELECTED model is always visible even when it is off the shortlist —
  // otherwise reopening the picker would show no checked row and read as though
  // the selection had been lost.
  const visible = models.filter(
    (model) => model.shortlist === true || model.id === selectedModelId,
  );
  if (visible.length === 0 || visible.length === models.length) {
    return { hiddenCount: 0, models };
  }

  return { hiddenCount: models.length - visible.length, models: visible };
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
    // Searching reveals a collapsed group's full catalog — the shortlist only
    // decides what shows BEFORE the user types.
    const isSearching = search.trim() !== '';

    // Favorites are an explicit user choice, so they are never collapsed.
    const favorites = models.filter((model) => model.favorite === true);
    if (favorites.length > 0) {
      out.push({
        hiddenCount: 0,
        id: FAVORITES_GROUP_ID,
        label: FAVORITES_GROUP_LABEL,
        models: favorites,
      });
    }

    for (const group of groups) {
      const groupModels = models.filter((model) => model.groupId === group.id);
      if (groupModels.length > 0) {
        out.push({
          ...applyShortlist(groupModels, isSearching, selectedModelId),
          icon: group.icon,
          id: group.id,
          label: group.label,
        });
      }
    }

    const knownGroupIds = new Set(groups.map((group) => group.id));
    const ungrouped = models.filter(
      (model) => model.groupId == null || !knownGroupIds.has(model.groupId),
    );
    if (ungrouped.length > 0) {
      out.push({
        ...applyShortlist(ungrouped, isSearching, selectedModelId),
        id: OTHER_GROUP_ID,
        label: OTHER_GROUP_LABEL,
      });
    }

    return out;
  }, [groups, models, search, selectedModelId]);

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
      // Match on the model's own groupId rather than the group's RENDERED rows:
      // a collapsed group may be hiding the selected model behind its shortlist.
      const owning = resolvedGroups.find(
        (group) =>
          group.id !== FAVORITES_GROUP_ID &&
          (group.id === selectedModel.groupId ||
            group.models.some((model) => model.id === selectedModel.id)),
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
