import * as React from 'react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { PencilIcon } from 'lucide-react';
import { SKILL_DETAIL_COPY } from '~/routing/skills/data/data.copy';

export interface SkillDetailEditControlsProps {
  /** Why editing is blocked; rendered in the disabled-Edit tooltip. */
  disabledTooltip: string;
  /** Checkout AND provenance both allow an edit — edit mode available. */
  editable: boolean;
  /** Draft differs from the pristine content; enables Save. */
  isDirty: boolean;
  isEditing: boolean;
  onCancel: () => void;
  onEdit: () => void;
  onSave: () => void;
  /** Action-side rejection message, shown inline next to Save. */
  saveError?: string;
  /** True while a save is submitting; disables Save/Cancel. */
  saving: boolean;
}

/**
 * @description Edit / Save / Cancel affordances (plus the disabled-edit
 * tooltip and inline save error) for the skill detail header. Split out of
 * SkillDetail (component-primitive-shape R6).
 */
export const SkillDetailEditControls = (
  props: SkillDetailEditControlsProps,
): React.ReactElement => {
  const {
    disabledTooltip,
    editable,
    isDirty,
    isEditing,
    onCancel,
    onEdit,
    onSave,
    saveError,
    saving,
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        {saveError ? (
          <p
            className="text-destructive text-xs"
            data-testid="skill-save-error"
            role="alert"
          >
            {saveError}
          </p>
        ) : null}
        <Button
          data-testid="skill-save-button"
          disabled={!isDirty || saving}
          onClick={onSave}
          size="xs"
        >
          {SKILL_DETAIL_COPY.saveLabel}
        </Button>
        <Button
          data-testid="skill-cancel-button"
          disabled={saving}
          onClick={onCancel}
          size="xs"
          variant="outline"
        >
          {SKILL_DETAIL_COPY.cancelLabel}
        </Button>
      </div>
    );
  }

  if (editable) {
    return (
      <Button
        data-testid="skill-edit-button"
        onClick={onEdit}
        size="xs"
        variant="outline"
      >
        <PencilIcon className="size-4" />
        {SKILL_DETAIL_COPY.editLabel}
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild={true}>
        {/* span keeps the tooltip live over the disabled button */}
        <span data-testid="skill-edit-disabled">
          <Button disabled={true} size="xs" variant="outline">
            <PencilIcon className="size-4" />
            {SKILL_DETAIL_COPY.editLabel}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs" side="top">
        {disabledTooltip}
      </TooltipContent>
    </Tooltip>
  );
};
