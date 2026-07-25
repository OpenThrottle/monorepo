import * as React from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { Loader2, Mic, Paperclip } from 'lucide-react';
import clsx from 'clsx';
import { ChatCheckoutSelector } from './ChatCheckoutSelector';
import { ChatModelPicker } from './ChatModelPicker';
import { ChatPermissionModeControl } from './ChatPermissionModeControl';
import { ChatReasoningTierControl } from './ChatReasoningTierControl';
import { ChatComposerMicState, ChatComposerMode } from '../types';
import type {
  ChatBackendCapabilities,
  ChatCheckoutOption,
  ChatContextSource,
  ChatModelGroup,
  ChatModelOption,
  ChatPermissionMode,
  ChatPersonaOption,
  ChatReasoningLevel,
  ChatServiceTier,
} from '../types';

export interface ChatComposerToolbarProps {
  /**
   * Selected backend's capabilities. When supplied, the toolbar gates the new
   * reasoning/tier, permission, and checkout controls by it. When omitted, none
   * of those controls render and the toolbar behaves exactly as before.
   */
  readonly capabilities?: ChatBackendCapabilities;
  /**
   * Repositories/checkouts for {@link ChatCheckoutSelector}. Rendered only when
   * {@link capabilities} reports `requiresRepository` and this list is supplied.
   */
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
  /** Toggle voice input (click starts / click stops); omit to hide the mic control. */
  readonly onMicToggle?: () => void;
  readonly onModeChange?: (mode: ChatComposerMode) => void;
  readonly onModelChange?: (modelId: string) => void;
  readonly onPermissionModeChange?: (mode: ChatPermissionMode) => void;
  readonly onPersonaChange?: (personaId: string) => void;
  readonly onReasoningChange?: (level: ChatReasoningLevel) => void;
  readonly onServiceTierChange?: (tier: ChatServiceTier) => void;
  /** Toggle a model's favorite flag; forwarded to {@link ChatModelPicker}. */
  readonly onToggleFavorite?: (modelId: string) => void;
  /** Selected permission mode; pair with {@link capabilities}. */
  readonly permissionMode?: ChatPermissionMode;
  /** Selected persona id; pair with {@link personas}. */
  readonly personaId?: string;
  /** Selectable personas; omit to hide the persona control. */
  readonly personas?: readonly ChatPersonaOption[];
  /** Selected reasoning level; pair with {@link capabilities}. */
  readonly reasoning?: ChatReasoningLevel;
  /** Selected checkout id; pair with {@link checkouts}. */
  readonly selectedCheckoutId?: string;
  /** Selected service tier; pair with {@link capabilities}. */
  readonly serviceTier?: ChatServiceTier;
}

/**
 * @description Controlled, presentational toolbar for the chat composer. Legacy
 * cluster: model / persona selectors, a Plan↔Build mode toggle, an attach
 * control, and a toggle-only voice-input mic. T3-style cluster (all additive
 * and independently optional): a grouped {@link ChatModelPicker} (engaged by
 * supplying `modelGroups`), a {@link ChatReasoningTierControl}, a
 * {@link ChatPermissionModeControl}, and a {@link ChatCheckoutSelector}. The
 * three capability-gated controls render only when `capabilities` is supplied
 * (checkout additionally requires `requiresRepository` + a `checkouts` list);
 * with none of the new props the toolbar renders exactly as before. The
 * package hardcodes no model/persona/capability data; consumers own state and
 * content (including all capture/transcription logic).
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
    mode,
    modelGroups,
    modelId,
    models,
    onAddContext,
    onCheckoutChange,
    onMicToggle,
    onModeChange,
    onModelChange,
    onPermissionModeChange,
    onPersonaChange,
    onReasoningChange,
    onServiceTierChange,
    onToggleFavorite,
    permissionMode,
    personaId,
    personas,
    reasoning,
    selectedCheckoutId,
    serviceTier,
  } = props;

  // Hooks

  // Setup
  const hasModels = models != null && models.length > 0;
  const useGroupedPicker = hasModels && modelGroups != null;
  const hasPersonas = personas != null && personas.length > 0;
  const hasContextSources = contextSources != null && contextSources.length > 0;
  const showAttach = onAddContext != null;
  const showReasoningTier = capabilities != null;
  const showPermission = capabilities != null;
  const showCheckout =
    capabilities?.requiresRepository === true && checkouts != null;
  const showMic = onMicToggle != null;
  const isMicFinalizing = micState === ChatComposerMicState.finalizing;
  const isMicRecording = micState === ChatComposerMicState.recording;
  const micLabel = isMicRecording
    ? 'Stop voice input'
    : isMicFinalizing
      ? 'Transcribing…'
      : micState === ChatComposerMicState.disabled
        ? 'Voice input unavailable'
        : 'Start voice input';

  // Handlers
  const onModeValueChange = (value: string): void => {
    if (value === ChatComposerMode.build || value === ChatComposerMode.plan) {
      onModeChange?.(value);
    }
  };

  // Markup
  const modelControl = useGroupedPicker ? (
    <ChatModelPicker
      disabledModelIds={disabledModelIds}
      groups={modelGroups ?? []}
      models={models ?? []}
      onModelChange={onModelChange ?? (() => undefined)}
      onToggleFavorite={onToggleFavorite}
      selectedModelId={modelId}
    />
  ) : hasModels ? (
    <Select onValueChange={onModelChange} value={modelId}>
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild={true}>
          <SelectTrigger
            aria-label="Model"
            className="h-8 w-auto min-w-32 gap-1"
            data-testid="ChatComposerToolbar-model-select"
          >
            <SelectValue placeholder="Model" />
          </SelectTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">Model</TooltipContent>
      </Tooltip>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            {model.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : null;

  const personaControl = hasPersonas ? (
    <Select onValueChange={onPersonaChange} value={personaId}>
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild={true}>
          <SelectTrigger
            aria-label="Agent"
            className="h-8 w-auto min-w-32 gap-1"
            data-testid="ChatComposerToolbar-persona-select"
          >
            <SelectValue placeholder="Agent" />
          </SelectTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">Agent</TooltipContent>
      </Tooltip>
      <SelectContent>
        {personas.map((persona) => (
          <SelectItem key={persona.id} value={persona.id}>
            {persona.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : null;

  const modeControl =
    mode != null ? (
      <ToggleGroup
        aria-label="Mode"
        data-testid="ChatComposerToolbar-mode-toggle"
        onValueChange={onModeValueChange}
        size="sm"
        type="single"
        value={mode}
        variant="outline"
      >
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild={true}>
            <ToggleGroupItem
              data-testid="ChatComposerToolbar-mode-plan"
              value={ChatComposerMode.plan}
            >
              Plan
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="top">
            Plan — describe intent to get a decomposed plan
          </TooltipContent>
        </Tooltip>
        <Tooltip delayDuration={500}>
          <TooltipTrigger asChild={true}>
            <ToggleGroupItem
              data-testid="ChatComposerToolbar-mode-build"
              value={ChatComposerMode.build}
            >
              Build
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="top">Build — agentic execution</TooltipContent>
        </Tooltip>
      </ToggleGroup>
    ) : null;

  const reasoningTierControl =
    showReasoningTier && capabilities != null ? (
      <ChatReasoningTierControl
        capabilities={capabilities}
        onReasoningChange={onReasoningChange}
        onServiceTierChange={onServiceTierChange}
        reasoning={reasoning}
        serviceTier={serviceTier}
      />
    ) : null;

  const permissionControl =
    showPermission && capabilities != null ? (
      <ChatPermissionModeControl
        capabilities={capabilities}
        onPermissionModeChange={onPermissionModeChange}
        permissionMode={permissionMode}
      />
    ) : null;

  const checkoutControl =
    showCheckout && checkouts != null ? (
      <ChatCheckoutSelector
        checkouts={checkouts}
        onCheckoutChange={onCheckoutChange ?? (() => undefined)}
        selectedCheckoutId={selectedCheckoutId}
      />
    ) : null;

  const attachControl = !showAttach ? null : hasContextSources ? (
    <DropdownMenu>
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild={true}>
          <DropdownMenuTrigger asChild={true}>
            <Button
              aria-label="Add context"
              data-testid="ChatComposerToolbar-attach"
              size="icon"
              type="button"
              variant="ghost"
            >
              <Paperclip className="size-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">Add context</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start">
        {contextSources.map((source) => (
          <DropdownMenuItem
            key={source.id}
            onSelect={() => onAddContext(source.id)}
          >
            {source.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild={true}>
        <Button
          aria-label="Add context"
          data-testid="ChatComposerToolbar-attach"
          disabled={true}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Paperclip className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">No context sources available</TooltipContent>
    </Tooltip>
  );

  const micControl = !showMic ? null : (
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild={true}>
        <Button
          aria-label={micLabel}
          aria-pressed={isMicRecording}
          className={clsx({
            'text-destructive hover:text-destructive': isMicRecording,
          })}
          data-mic-state={micState}
          data-testid="ChatComposerToolbar-mic"
          disabled={
            micState === ChatComposerMicState.disabled || isMicFinalizing
          }
          onClick={onMicToggle}
          size="icon"
          type="button"
          variant="ghost"
        >
          {isMicFinalizing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Mic
              className={clsx('size-4', {
                'animate-pulse': isMicRecording,
              })}
            />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{micLabel}</TooltipContent>
    </Tooltip>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('flex flex-wrap items-center gap-2', className)}
      data-testid="ChatComposerToolbar"
    >
      {modelControl}
      {reasoningTierControl}
      {permissionControl}
      {checkoutControl}
      {personaControl}
      {modeControl}
      {attachControl}
      {micControl}
    </div>
  );
};
