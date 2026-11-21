import { Input, Label } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { RULES_COPY } from '~/routing/rules/data/data.copy';

export interface RuleFormIdentitySectionProps {
  readonly onTitleChange: (title: string) => void;
  readonly title: string;
}

/**
 * @description The "Identity" fieldset of the rules form: the rule title input.
 * Split out of RuleForm to keep that component under the size cap.
 */
export const RuleFormIdentitySection = (
  props: RuleFormIdentitySectionProps,
): React.ReactElement => {
  const { onTitleChange, title } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{RULES_COPY.identityLegend}</h3>
        <p className="text-muted-foreground text-xs">
          {RULES_COPY.identityDescription}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rule-title">{RULES_COPY.titleLabel}</Label>
        <Input
          id="rule-title"
          name="title"
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={RULES_COPY.titlePlaceholder}
          required={true}
          value={title}
        />
      </div>
    </section>
  );
};
