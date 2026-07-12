import * as React from 'react';
import clsx from 'clsx';
import { SKILL_AVAILABILITY_COPY } from '~/routing/skills/data/data.copy';
import { SkillAvailabilityRuleForm } from '~/routing/skills/components/SkillAvailabilityRuleForm';
import type { SkillAvailabilityRuleValue } from '~/routing/skills/utils/skill-availability';

const COPY = SKILL_AVAILABILITY_COPY.rules;

export interface SkillAvailabilityRulesEditorProps {
  readonly className?: string;
  /** Saved rules for the project's rule set (empty when the set has no rules yet). */
  readonly rules: readonly SkillAvailabilityRuleValue[];
  /** Workspace vocabulary that constrains every rule's tag pickers. */
  readonly vocabulary: readonly string[];
}

/**
 * @description The rules section of the authoring surface: one editable {@link SkillAvailabilityRuleForm}
 * per saved rule (update/remove) plus a trailing blank form to add a new rule. Rules are evaluated
 * at precedence rungs 1–2; ordering here is display-only.
 */
export const SkillAvailabilityRulesEditor = (
  props: SkillAvailabilityRulesEditorProps,
): React.ReactElement => {
  const { className, rules, vocabulary } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      className={clsx('flex flex-col gap-4', className)}
      data-testid="SkillAvailabilityRulesEditor"
    >
      <h2 className="text-lg font-semibold">{COPY.heading}</h2>

      {rules.length === 0 ? (
        <p className="text-muted-foreground text-sm">{COPY.emptyNote}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rules.map((rule) => (
            <li key={rule.id}>
              <SkillAvailabilityRuleForm
                mode="edit"
                rule={rule}
                vocabulary={vocabulary}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-muted-foreground text-sm font-medium">
          {COPY.addLabel}
        </h3>
        <SkillAvailabilityRuleForm mode="add" vocabulary={vocabulary} />
      </div>
    </section>
  );
};
