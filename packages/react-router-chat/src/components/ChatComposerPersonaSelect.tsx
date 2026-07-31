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
import type { ChatPersonaOption } from '../types';

export interface ChatComposerPersonaSelectProps {
  readonly onPersonaChange?: (personaId: string) => void;
  /** Selectable personas; the control renders nothing when empty/omitted. */
  readonly personas?: readonly ChatPersonaOption[];
  readonly selectedPersonaId?: string;
}

/**
 * @description Agent/persona selector for {@link ChatComposerToolbar} — a plain
 * `Select` over the supplied personas. Renders nothing when no personas are
 * supplied. Presentational; the consumer owns the selection.
 *
 * @public
 */
export const ChatComposerPersonaSelect = (
  props: ChatComposerPersonaSelectProps,
): React.ReactElement | null => {
  const { onPersonaChange, personas, selectedPersonaId } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (personas == null || personas.length === 0) {
    return null;
  }

  return (
    <Select onValueChange={onPersonaChange} value={selectedPersonaId}>
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
  );
};
