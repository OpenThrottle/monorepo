import * as React from 'react';
import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import { RULES_COPY } from '~/routing/rules/data/data.copy';
import {
  ANY,
  ENVIRONMENTS,
  PLAN_STATUSES,
} from '~/routing/rules/data/rule-form-options';
import type { RuleFormVocabularyOption } from '~/routing/rules/components/RuleForm';

export interface RuleFormMatchSectionProps {
  environment: string;
  onEnvironmentChange: (environment: string) => void;
  onStatusChange: (status: string) => void;
  onToggleTag: (tag: string) => void;
  status: string;
  tagAll: string[];
  vocabulary: RuleFormVocabularyOption[];
}

/**
 * @description The "Match" fieldset of the rules form: phase/domain tag chips
 * plus the status and environment selects. Split out of RuleForm to keep that
 * component under the R6 size cap.
 */
export const RuleFormMatchSection = (
  props: RuleFormMatchSectionProps,
): React.ReactElement => {
  const {
    environment,
    onEnvironmentChange,
    onStatusChange,
    onToggleTag,
    status,
    tagAll,
    vocabulary,
  } = props;

  // Hooks

  // Setup
  const domainOptions = vocabulary.filter(
    (option) => option.dimension === 'domain',
  );
  const phaseOptions = vocabulary.filter(
    (option) => option.dimension === 'phase',
  );

  // Handlers

  // Markup
  const renderTagChip = (
    option: RuleFormVocabularyOption,
  ): React.ReactElement => {
    const selected = tagAll.includes(option.tag);
    return (
      <Button
        aria-pressed={selected}
        key={option.tag}
        onClick={() => onToggleTag(option.tag)}
        size="sm"
        type="button"
        variant={selected ? 'default' : 'outline'}
      >
        {option.tag}
      </Button>
    );
  };

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">{RULES_COPY.matchLegend}</h3>
        <p className="text-muted-foreground text-xs">
          {RULES_COPY.matchDescription}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>{RULES_COPY.phaseTagsLabel}</Label>
        <div className="flex flex-wrap gap-2">
          {phaseOptions.map(renderTagChip)}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{RULES_COPY.domainTagsLabel}</Label>
        <div className="flex flex-wrap gap-2">
          {domainOptions.map(renderTagChip)}
        </div>
      </div>

      {tagAll.length === 0 ? (
        <p className="text-muted-foreground text-xs italic">
          {RULES_COPY.noTagsHint}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="rule-status">{RULES_COPY.statusLabel}</Label>
          <Select onValueChange={onStatusChange} value={status}>
            <SelectTrigger aria-label={RULES_COPY.statusLabel} id="rule-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{RULES_COPY.anyOption}</SelectItem>
              {PLAN_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rule-environment">
            {RULES_COPY.environmentLabel}
          </Label>
          <Select onValueChange={onEnvironmentChange} value={environment}>
            <SelectTrigger
              aria-label={RULES_COPY.environmentLabel}
              id="rule-environment"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>{RULES_COPY.anyOption}</SelectItem>
              {ENVIRONMENTS.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
};
