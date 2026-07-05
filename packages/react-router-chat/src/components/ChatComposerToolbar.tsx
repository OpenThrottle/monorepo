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
import classnames from 'classnames';
import { ChatComposerMicState, ChatComposerMode } from '../types';
import type {
  ChatContextSource,
  ChatModelOption,
  ChatPersonaOption,
} from '../types';

export interface ChatComposerToolbarProps {
  readonly className?: string;
  /** Context sources for the attach control; omit to hide the control. */
  readonly contextSources?: readonly ChatContextSource[];
  /** Voice-input state reflected by the mic control; pair with {@link onMicToggle}. */
  readonly micState?: ChatComposerMicState;
  /** Selected agent mode; omit to hide the mode toggle. */
  readonly mode?: ChatComposerMode;
  /** Selected model id; pair with {@link models}. */
  readonly modelId?: string;
  /** Selectable models; omit to hide the model control. */
  readonly models?: readonly ChatModelOption[];
  readonly onAddContext?: (sourceId: string) => void;
  /** Toggle voice input (click starts / click stops); omit to hide the mic control. */
  readonly onMicToggle?: () => void;
  readonly onModeChange?: (mode: ChatComposerMode) => void;
  readonly onModelChange?: (modelId: string) => void;
  readonly onPersonaChange?: (personaId: string) => void;
  /** Selected persona id; pair with {@link personas}. */
  readonly personaId?: string;
  /** Selectable personas; omit to hide the persona control. */
  readonly personas?: readonly ChatPersonaOption[];
}

/**
 * @description Controlled, presentational toolbar for the chat composer:
 * model / persona selectors, a Plan↔Build mode toggle, an attach control, and
 * a toggle-only voice-input mic. Each control is independently optional —
 * supply its props to render it. The package hardcodes no model/persona data;
 * consumers own state and content (including all capture/transcription logic).
 *
 * @publicApi
 */
export const ChatComposerToolbar = (
  props: ChatComposerToolbarProps,
): React.ReactElement => {
  const {
    className,
    contextSources,
    micState = ChatComposerMicState.idle,
    mode,
    modelId,
    models,
    onAddContext,
    onMicToggle,
    onModeChange,
    onModelChange,
    onPersonaChange,
    personaId,
    personas,
  } = props;

  // Hooks

  // Setup
  const hasModels = models != null && models.length > 0;
  const hasPersonas = personas != null && personas.length > 0;
  const hasContextSources = contextSources != null && contextSources.length > 0;
  const showAttach = onAddContext != null;
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
  const modelControl = hasModels ? (
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
          className={classnames({
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
              className={classnames('size-4', {
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
      className={classnames('flex flex-wrap items-center gap-2', className)}
      data-testid="ChatComposerToolbar"
    >
      {modelControl}
      {personaControl}
      {modeControl}
      {attachControl}
      {micControl}
    </div>
  );
};
