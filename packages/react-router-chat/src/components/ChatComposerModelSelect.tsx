import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import type { ChatModelOption } from '../types';

export interface ChatComposerModelSelectProps {
  readonly models: readonly ChatModelOption[];
  readonly onModelChange?: (modelId: string) => void;
  readonly selectedModelId?: string;
}

/**
 * @description Legacy flat model selector for {@link ChatComposerToolbar} — a
 * plain `Select` over the supplied models, used when no grouped
 * {@link ChatModelGroup} list is provided. Presentational; the consumer owns the
 * selection.
 *
 * @public
 */
export const ChatComposerModelSelect = (
  props: ChatComposerModelSelectProps,
): React.ReactElement => {
  const { models, onModelChange, selectedModelId } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Select onValueChange={onModelChange} value={selectedModelId}>
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
  );
};
