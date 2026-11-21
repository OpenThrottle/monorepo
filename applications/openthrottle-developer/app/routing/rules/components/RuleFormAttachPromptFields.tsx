import type { ComboboxOption } from '@openthrottle/react-router-shadcn';
import {
  Button,
  Combobox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import { RULES_COPY } from '~/routing/rules/data/data.copy';
import { ATTACH_PROMPT_PLACEMENTS } from '~/routing/rules/data/data.rule-form-options';
import type { RuleFormAttachPromptState } from '~/routing/rules/types';
import type { RuleFormPromptOption } from '~/routing/rules/utils/rule-prompt-options';

export interface RuleFormAttachPromptFieldsProps {
  readonly attachPrompt: RuleFormAttachPromptState;
  readonly promptOptions: readonly RuleFormPromptOption[];
}

const PLACEMENT_LABELS = {
  end: RULES_COPY.attachPromptPlacementEnd,
  start: RULES_COPY.attachPromptPlacementStart,
} as const;

const OWNER_LABELS = {
  system: RULES_COPY.promptOwnerSystem,
  yours: RULES_COPY.promptOwnerYours,
} as const;

const TYPE_LABELS = {
  personas: RULES_COPY.promptTypePersonas,
  prompts: RULES_COPY.promptTypePrompts,
} as const;

/**
 * @description The attach-prompt payload fields of the rule action section: a
 * searchable prompt picker (each entry shows whether the prompt is yours or a
 * system prompt) and a Start/End placement. With no prompts to offer it links
 * to the prompt creator instead of rendering a dead picker, and a rule whose
 * saved reference is no longer visible renders a "not available" notice.
 */
export const RuleFormAttachPromptFields = (
  props: RuleFormAttachPromptFieldsProps,
): React.ReactElement => {
  const { attachPrompt, promptOptions } = props;
  const { filePath, onPlacementChange, onPromptChange, placement, promptId } =
    attachPrompt;

  // Hooks

  // Setup
  const hasOptions = promptOptions.length > 0;
  const hasReference = promptId !== '' || filePath !== '';
  const isReferenceVisible = promptOptions.some(
    (option) => option.id === promptId,
  );
  const isFilePathReference = filePath !== '' && promptId === '';
  const isNotAvailable = hasReference && !isReferenceVisible;
  const pickerOptions: ComboboxOption[] = promptOptions.map((option) => {
    const owner = OWNER_LABELS[option.owner];

    return {
      hint: TYPE_LABELS[option.promptType],
      label: `${option.title} (${owner})`,
      value: option.id,
    };
  });

  // Handlers
  const handleValueChange = (value: string): void => {
    const chosen = promptOptions.find((option) => option.id === value);
    if (chosen !== undefined) {
      onPromptChange(chosen.id, chosen.promptType);
    }
  };

  // Markup
  const emptyState = (
    <div className="space-y-2" data-testid="RuleFormAttachPromptEmpty">
      <p className="text-muted-foreground text-sm">
        {RULES_COPY.promptEmptyBody}
      </p>
      <Button asChild={true} size="sm" variant="outline">
        <Link to="/prompts/create">{RULES_COPY.promptEmptyAction}</Link>
      </Button>
    </div>
  );
  const picker = (
    <Combobox
      id="rule-prompt"
      onValueChange={handleValueChange}
      options={pickerOptions}
      placeholder={RULES_COPY.promptPlaceholder}
      searchPlaceholder={RULES_COPY.promptSearchPlaceholder}
      value={promptId}
    />
  );
  const notAvailable = (
    <div
      className="border-destructive/40 text-destructive rounded-md border p-3 text-xs"
      role="status"
    >
      <p className="font-medium">{RULES_COPY.promptNotAvailableTitle}</p>
      <p>{RULES_COPY.promptNotAvailableBody}</p>
      {isFilePathReference && (
        <p>
          {RULES_COPY.promptNotAvailableFilePathPrefix} <code>{filePath}</code>
        </p>
      )}
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="rule-prompt">{RULES_COPY.promptLabel}</Label>
        {hasOptions ? picker : emptyState}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rule-attach-placement">
          {RULES_COPY.attachPromptPlacementLabel}
        </Label>
        <Select onValueChange={onPlacementChange} value={placement}>
          <SelectTrigger
            aria-label={RULES_COPY.attachPromptPlacementLabel}
            id="rule-attach-placement"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ATTACH_PROMPT_PLACEMENTS.map((value) => (
              <SelectItem key={value} value={value}>
                {PLACEMENT_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isNotAvailable && <div className="sm:col-span-2">{notAvailable}</div>}
    </div>
  );
};
