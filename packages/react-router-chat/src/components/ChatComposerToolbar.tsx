import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type {
  ChatCheckoutOption,
  ChatComposerCapabilityProps,
  ChatComposerMode,
  ChatContextSource,
  ChatModelGroup,
  ChatModelOption,
  ChatPersonaOption,
} from '../types';
import { ChatComposerMicState } from '../types';
import { ChatComposerAttachControl } from './ChatComposerAttachControl';
import { ChatComposerCheckoutControl } from './ChatComposerCheckoutControl';
import { ChatComposerMicControl } from './ChatComposerMicControl';
import { ChatComposerModelControl } from './ChatComposerModelControl';
import { ChatComposerPersistControl } from './ChatComposerPersistControl';
import { ChatComposerPersonaSelect } from './ChatComposerPersonaSelect';
import { ChatPermissionModeControl } from './ChatPermissionModeControl';
import { ChatReasoningTierControl } from './ChatReasoningTierControl';

/** Toolbar props; the capability-gated ones come from {@link ChatComposerCapabilityProps}. */
export interface ChatComposerToolbarProps extends ChatComposerCapabilityProps {
  /** Checkouts for {@link ChatComposerCheckoutControl}, which gates on them. */
  readonly checkouts?: readonly ChatCheckoutOption[];
  readonly className?: string;
  /** Context sources for the attach control; omit to hide the control. */
  readonly contextSources?: readonly ChatContextSource[];
  /** Model ids the caller has gated off; forwarded to {@link ChatModelPicker}. */
  readonly disabledModelIds?: readonly string[];
  /** Voice-input state reflected by the mic control; pair with {@link onMicToggle}. */
  readonly micState?: ChatComposerMicState;
  /** Selected agent mode; omit to hide the mode toggle. */
  readonly mode?: ChatComposerMode;
  /**
   * Provider/CLI groups. When supplied, the model control upgrades from the
   * flat Select to the grouped, searchable {@link ChatModelPicker} (using
   * {@link models} as the option list). Omit for the legacy flat control.
   */
  readonly modelGroups?: readonly ChatModelGroup[];
  /** Selected model id; pair with {@link models}. */
  readonly modelId?: string;
  /** Selectable models; omit to hide the model control. */
  readonly models?: readonly ChatModelOption[];
  readonly onAddContext?: (sourceId: string) => void;
  readonly onCheckoutChange?: (checkoutId: string) => void;
  /** Primary-first multi-select callback; omit to force single-select. */
  readonly onCheckoutsChange?: (checkoutIds: readonly string[]) => void;
  /** Toggle voice input (click starts / click stops); omit to hide the mic control. */
  readonly onMicToggle?: () => void;
  readonly onModeChange?: (mode: ChatComposerMode) => void;
  readonly onModelChange?: (modelId: string) => void;
  /** Forwarded to the grouped {@link ChatModelPicker} rail's gear; omit to hide it. */
  readonly onOpenSettings?: () => void;
  /** Renders the (never capability-gated) persist switch when supplied; omit to hide. Pair with {@link persist}. */
  readonly onPersistChange?: (persist: boolean) => void;
  readonly onPersonaChange?: (personaId: string) => void;
  /** Toggle a model's favorite flag; forwarded to {@link ChatModelPicker}. */
  readonly onToggleFavorite?: (modelId: string) => void;
  /**
   * Whether turns are persisted (default true when the switch is shown). false
   * is Private mode — an ephemeral turn with a "not saved" affordance. Pair with
   * {@link onPersistChange}.
   */
  readonly persist?: boolean;
  /** Selected persona id; pair with {@link personas}. */
  readonly personaId?: string;
  /** Selectable personas; omit to hide the persona control. */
  readonly personas?: readonly ChatPersonaOption[];
  /** Selected checkout id; pair with {@link checkouts}. */
  readonly selectedCheckoutId?: string;
  /** Primary-first selection (index 0 is the spawn cwd) for multi-select. */
  readonly selectedCheckoutIds?: readonly string[];
}

/**
 * @description Controlled, presentational toolbar for the chat composer. Legacy
 * cluster: model / persona selectors, a Plan↔Build mode toggle, an attach
 * control, and a toggle-only voice-input mic. T3-style cluster (all additive
 * and independently optional): a grouped {@link ChatModelPicker} (engaged by
 * supplying `modelGroups`), a {@link ChatReasoningTierControl}, a
 * {@link ChatPermissionModeControl}, and a
 * {@link ChatComposerCheckoutControl}. The three capability-gated controls
 * render only when `capabilities` is supplied; with none of the new props the
 * toolbar renders exactly as before. The package hardcodes no
 * model/persona/capability data; consumers own state and content.
 *
 * @public
 */
export const ChatComposerToolbar = (
  props: ChatComposerToolbarProps,
): React.ReactElement => {
  const {
    capabilities,
    checkouts,
    className,
    contextSources,
    disabledModelIds,
    micState = ChatComposerMicState.idle,
    modelGroups,
    modelId,
    models,
    onAddContext,
    onCheckoutChange,
    onCheckoutsChange,
    onMicToggle,
    onModelChange,
    onOpenSettings,
    onPermissionModeChange,
    onPersistChange,
    onPersonaChange,
    onReasoningChange,
    onRememberPermissionModeChange,
    onServiceTierChange,
    onToggleFavorite,
    permissionMode,
    persist = true,
    personaId,
    personas,
    reasoning,
    rememberPermissionMode,
    selectedCheckoutId,
    selectedCheckoutIds,
    serviceTier,
  } = props;

  // Hooks

  // Setup
  // The Plan/Build mode toggle is intentionally not surfaced today; `mode` /
  // `onModeChange` remain accepted so callers can wire it without an API change.

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('flex flex-wrap items-center gap-2', className)}
      data-testid="ChatComposerToolbar"
    >
      <ChatComposerModelControl
        disabledModelIds={disabledModelIds}
        modelGroups={modelGroups}
        modelId={modelId}
        models={models}
        onModelChange={onModelChange}
        onOpenSettings={onOpenSettings}
        onToggleFavorite={onToggleFavorite}
      />
      {capabilities != null && (
        <ChatReasoningTierControl
          capabilities={capabilities}
          onReasoningChange={onReasoningChange}
          onServiceTierChange={onServiceTierChange}
          reasoning={reasoning}
          serviceTier={serviceTier}
        />
      )}
      {capabilities != null && (
        <ChatPermissionModeControl
          capabilities={capabilities}
          onPermissionModeChange={onPermissionModeChange}
          onRememberPermissionModeChange={onRememberPermissionModeChange}
          permissionMode={permissionMode}
          rememberPermissionMode={rememberPermissionMode}
        />
      )}
      <ChatComposerCheckoutControl
        capabilities={capabilities}
        checkouts={checkouts}
        onCheckoutChange={onCheckoutChange}
        onCheckoutsChange={onCheckoutsChange}
        selectedCheckoutId={selectedCheckoutId}
        selectedCheckoutIds={selectedCheckoutIds}
      />
      <ChatComposerPersonaSelect
        onPersonaChange={onPersonaChange}
        personas={personas}
        selectedPersonaId={personaId}
      />
      <ChatComposerAttachControl
        contextSources={contextSources}
        onAddContext={onAddContext}
      />
      <ChatComposerMicControl micState={micState} onMicToggle={onMicToggle} />
      <ChatComposerPersistControl
        onPersistChange={onPersistChange}
        persist={persist}
      />
    </div>
  );
};
