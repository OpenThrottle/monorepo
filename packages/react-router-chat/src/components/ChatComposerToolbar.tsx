import * as React from 'react';
import {
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
import classnames from 'classnames';
import { ChatComposerMode } from '../types';
import type {
  ChatContextSource,
  ChatModelOption,
  ChatPersonaOption,
} from '../types';

export interface ChatComposerToolbarProps {
  readonly className?: string;
  /** Context sources for the attach control; omit to hide the control. */
  readonly contextSources?: readonly ChatContextSource[];
  /** Selected agent mode; omit to hide the mode toggle. */
  readonly mode?: ChatComposerMode;
  /** Selected model id; pair with {@link models}. */
  readonly modelId?: string;
  /** Selectable models; omit to hide the model control. */
  readonly models?: readonly ChatModelOption[];
  readonly onAddContext?: (sourceId: string) => void;
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
 * model / persona selectors, a Plan↔Build mode toggle, and an attach control.
 * Each control is independently optional — supply its props to render it. The
 * package hardcodes no model/persona data; consumers own state and content.
 *
 * @publicApi
 */
export const ChatComposerToolbar = (
  props: ChatComposerToolbarProps,
): React.ReactElement => {
  const {
    className,
    mode,
    modelId,
    models,
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
    </div>
  );
};
