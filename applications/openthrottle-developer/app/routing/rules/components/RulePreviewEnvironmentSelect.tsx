import {
  cn,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { useSearchParams } from 'react-router';

import { RULE_PREVIEW_ENVIRONMENT_PARAM } from '~/routing/rules/config/rule-preview';
import { RULE_PREVIEW_COPY } from '~/routing/rules/data/data.copy';
import { ENVIRONMENTS } from '~/routing/rules/data/data.rule-form-options';
import { parseRulePreviewEnvironment } from '~/routing/rules/utils/rule-preview-params';

export interface RulePreviewEnvironmentSelectProps {
  readonly className?: string;
}

const NONE = 'none';

/**
 * @description Environment to preview a rule in (None / ci / interactive / ralph), kept in the
 * `previewEnvironment` search param so a preview is linkable and the loader re-runs it. "None" is
 * what a developer-app edit evaluates in. Param-only updates replace history and keep the scroll position.
 */
export const RulePreviewEnvironmentSelect = (
  props: RulePreviewEnvironmentSelectProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup
  const selected =
    parseRulePreviewEnvironment(
      searchParams.get(RULE_PREVIEW_ENVIRONMENT_PARAM),
    ) ?? NONE;
  const selectedLabel =
    selected === NONE ? RULE_PREVIEW_COPY.environmentNone : selected;

  // Handlers
  const handleValueChange = (value: string): void => {
    const next = new URLSearchParams(searchParams);
    if (value === NONE) {
      next.delete(RULE_PREVIEW_ENVIRONMENT_PARAM);
    } else {
      next.set(RULE_PREVIEW_ENVIRONMENT_PARAM, value);
    }
    setSearchParams(next, { preventScrollReset: true, replace: true });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Label htmlFor="rule-preview-environment">
        {RULE_PREVIEW_COPY.environmentLabel}
      </Label>
      <Select onValueChange={handleValueChange} value={selected}>
        <SelectTrigger id="rule-preview-environment">
          <SelectValue>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>
            {RULE_PREVIEW_COPY.environmentNone}
          </SelectItem>
          {ENVIRONMENTS.map((environment) => (
            <SelectItem key={environment} value={environment}>
              {environment}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
