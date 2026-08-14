import * as React from 'react';
import { ChatComposerModelSelect } from './ChatComposerModelSelect';
import { ChatModelPicker } from './ChatModelPicker';
import type { ChatModelGroup, ChatModelOption } from '../types';

export interface ChatComposerModelControlProps {
  readonly disabledModelIds?: readonly string[];
  /** Provider/CLI groups; when supplied the grouped picker is used. */
  readonly modelGroups?: readonly ChatModelGroup[];
  readonly modelId?: string;
  /** Selectable models; the control renders nothing when empty/omitted. */
  readonly models?: readonly ChatModelOption[];
  readonly onModelChange?: (modelId: string) => void;
  /** Forwarded to the grouped {@link ChatModelPicker}; omit to hide the gear. */
  readonly onOpenSettings?: () => void;
  readonly onToggleFavorite?: (modelId: string) => void;
}

/**
 * @description Model control for {@link ChatComposerToolbar}. Upgrades from the
 * legacy flat {@link ChatComposerModelSelect} to the grouped, searchable
 * {@link ChatModelPicker} when {@link ChatComposerModelControlProps.modelGroups}
 * is supplied. Renders nothing when no models are available.
 *
 * @public
 */
export const ChatComposerModelControl = (
  props: ChatComposerModelControlProps,
): React.ReactElement | null => {
  const {
    disabledModelIds,
    modelGroups,
    modelId,
    models,
    onModelChange,
    onOpenSettings,
    onToggleFavorite,
  } = props;

  // Hooks

  // Setup
  const hasModels = models != null && models.length > 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!hasModels) {
    return null;
  }

  if (modelGroups != null) {
    return (
      <ChatModelPicker
        disabledModelIds={disabledModelIds}
        groups={modelGroups}
        models={models}
        onModelChange={onModelChange ?? (() => undefined)}
        onOpenSettings={onOpenSettings}
        onToggleFavorite={onToggleFavorite}
        selectedModelId={modelId}
      />
    );
  }

  return (
    <ChatComposerModelSelect
      models={models}
      onModelChange={onModelChange}
      selectedModelId={modelId}
    />
  );
};
