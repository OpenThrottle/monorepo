import * as React from 'react';
import clsx from 'clsx';
import {
  Label,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import type { SkillCreateDestination } from '~/routing/skills/config/skill-create';
import {
  SKILL_CREATE_DESTINATIONS,
  isSkillCreateDestination,
} from '~/routing/skills/config/skill-create';
import {
  SKILL_CREATE_COPY,
  SKILL_CREATE_DESTINATION_CONSEQUENCE,
} from '~/routing/skills/data/data.copy';

export interface SkillCreateDestinationFieldProps {
  /**
   * `FEATURE_BETA_PREVIEW`, threaded in rather than read here: the flag is a
   * module-level const resolved at import time, so a component that read it
   * directly could only ever be rendered in one state. Passing it makes both
   * states testable without stubbing module state.
   */
  betaPreviewEnabled: boolean;
  className?: string;
  onChange: (destination: SkillCreateDestination) => void;
  value: SkillCreateDestination;
}

/**
 * @description Where a new skill is written: the author's personal tier, this
 * repository, or — only under `FEATURE_BETA_PREVIEW` — OpenThrottle's committed
 * catalog, which is meaningful only when working ON OpenThrottle.
 *
 * The control states the CONSEQUENCE of the choice below the buttons, not just
 * the name of each option. The labels mean nothing on their own — that one is
 * private and uncommittable, one lands in your own worktree for your team, and
 * one goes to OpenThrottle for a PR is the whole decision being made here.
 */
export const SkillCreateDestinationField = (
  props: SkillCreateDestinationFieldProps,
): React.ReactElement => {
  const { betaPreviewEnabled, className, onChange, value } = props;

  // Hooks

  // Setup
  const consequence = SKILL_CREATE_DESTINATION_CONSEQUENCE[value];

  // Handlers
  const handleValueChange = (next: string): void => {
    // Radix single toggle emits '' when the active item is clicked again; keep
    // the current selection rather than clearing it to no destination at all.
    if (isSkillCreateDestination(next)) {
      onChange(next);
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('flex flex-col gap-2', className)}
      data-testid="SkillCreateDestinationField"
    >
      <Label>{SKILL_CREATE_COPY.destinationFieldLabel}</Label>
      <ToggleGroup
        aria-label={SKILL_CREATE_COPY.destinationFieldLabel}
        attached={true}
        className="self-start"
        data-testid="skill-create-destination"
        onValueChange={handleValueChange}
        type="single"
        value={value}
        variant="outline"
      >
        <ToggleGroupItem value={SKILL_CREATE_DESTINATIONS.personal}>
          {SKILL_CREATE_COPY.destinationPersonalLabel}
        </ToggleGroupItem>
        <ToggleGroupItem value={SKILL_CREATE_DESTINATIONS.custom}>
          {SKILL_CREATE_COPY.destinationCustomLabel}
        </ToggleGroupItem>
        {betaPreviewEnabled ? (
          <ToggleGroupItem value={SKILL_CREATE_DESTINATIONS.openthrottle}>
            {SKILL_CREATE_COPY.destinationOpenThrottleLabel}
          </ToggleGroupItem>
        ) : null}
      </ToggleGroup>
      <p className="text-muted-foreground text-xs">{consequence}</p>
    </div>
  );
};
