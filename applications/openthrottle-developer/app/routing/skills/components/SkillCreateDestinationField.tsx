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
import { SKILL_CREATE_COPY } from '~/routing/skills/data/data.copy';

export interface SkillCreateDestinationFieldProps {
  className?: string;
  onChange: (destination: SkillCreateDestination) => void;
  value: SkillCreateDestination;
}

/**
 * @description Where a new skill is written: the author's personal tier, or the
 * repo's committed catalog.
 *
 * The control states the CONSEQUENCE of the choice below the buttons, not just
 * the name of each option. "Personal" and "OpenThrottle repo" mean nothing on
 * their own — that one is private and uncommittable while the other lands in
 * the worktree for you to commit and PR is the whole decision being made here.
 */
export const SkillCreateDestinationField = (
  props: SkillCreateDestinationFieldProps,
): React.ReactElement => {
  const { className, onChange, value } = props;

  // Hooks

  // Setup
  const consequence =
    value === SKILL_CREATE_DESTINATIONS.repo
      ? SKILL_CREATE_COPY.destinationRepoDescription
      : SKILL_CREATE_COPY.destinationPersonalDescription;

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
        <ToggleGroupItem value={SKILL_CREATE_DESTINATIONS.repo}>
          {SKILL_CREATE_COPY.destinationRepoLabel}
        </ToggleGroupItem>
      </ToggleGroup>
      <p className="text-muted-foreground text-xs">{consequence}</p>
    </div>
  );
};
