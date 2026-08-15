import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import { SKILL_RECORD_TAGS_COPY } from '~/routing/skills/data/data.copy';

export interface SkillOrphanRemoveButtonProps {
  disabled?: boolean;
  onRemove: () => void;
}

export const SkillOrphanRemoveButton = (
  props: SkillOrphanRemoveButtonProps,
): React.ReactElement => {
  const { disabled = false, onRemove } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Button
      data-testid="SkillOrphanRemoveButton"
      disabled={disabled}
      onClick={onRemove}
      size="xs"
      type="button"
      variant="outline"
    >
      {SKILL_RECORD_TAGS_COPY.orphanRemoveLabel}
    </Button>
  );
};
