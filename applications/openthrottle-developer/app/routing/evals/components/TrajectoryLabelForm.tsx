import {
  Button,
  cn,
  Input,
  Label,
  TextArea,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import { CheckIcon, XIcon } from 'lucide-react';
import * as React from 'react';

import type { AgentTrajectoryLabelRowFragment } from '~/__generated__/graphql';
import {
  TRAJECTORY_LABEL_INTENT,
  TRAJECTORY_NOTE_MAX_LENGTH,
} from '~/routing/evals/config/defaults';
import { TRAJECTORY_LABEL_COPY } from '~/routing/evals/data/data.copy';
import { useTrajectoryLabelForm } from '~/routing/evals/hooks/useTrajectoryLabelForm';

export interface TrajectoryLabelFormProps {
  readonly className?: string;
  /** Your stored label, which seeds the fields; `null` when you have none. */
  readonly current: AgentTrajectoryLabelRowFragment | null;
}

/**
 * @description Your verdict on a trajectory: pass or fail, an optional
 * failure type and a note. Saving replaces your earlier label; Remove deletes
 * it. Mount it keyed on the stored label so a save or removal resets the fields.
 */
export const TrajectoryLabelForm = (
  props: TrajectoryLabelFormProps,
): React.ReactElement => {
  const { className, current } = props;

  // Hooks
  const fieldId = React.useId();
  const {
    error,
    isRemoving,
    isSaving,
    onRemove,
    onSubmit,
    onVerdictChange,
    verdict,
  } = useTrajectoryLabelForm({ initialVerdict: current?.verdict ?? null });

  // Setup
  const copy = TRAJECTORY_LABEL_COPY;
  const isBusy = isSaving || isRemoving;
  const verdictLabelId = `${fieldId}-verdict`;
  const failureTypeId = `${fieldId}-failure-type`;
  const noteId = `${fieldId}-note`;

  // Handlers

  // Markup
  const errorAlert = (
    <p className="text-destructive text-sm" role="alert">
      {error}
    </p>
  );
  const removeButton = (
    <Button
      disabled={isBusy}
      onClick={onRemove}
      size="sm"
      type="button"
      variant="ghost"
    >
      {isRemoving ? copy.removing : copy.remove}
    </Button>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <form
      className={cn('flex flex-col gap-4', className)}
      data-testid="TrajectoryLabelForm"
      method="post"
      onSubmit={onSubmit}
    >
      <input
        name="intent"
        type="hidden"
        value={TRAJECTORY_LABEL_INTENT.label}
      />
      <input name="verdict" type="hidden" value={verdict ?? ''} />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium" id={verdictLabelId}>
          {copy.verdict}
        </span>
        <ToggleGroup
          aria-labelledby={verdictLabelId}
          attached={true}
          onValueChange={onVerdictChange}
          type="single"
          value={verdict ?? ''}
          variant="outline"
        >
          <ToggleGroupItem className="flex-1" value="pass">
            <CheckIcon />
            {copy.pass}
          </ToggleGroupItem>
          <ToggleGroupItem className="flex-1" value="fail">
            <XIcon />
            {copy.fail}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={failureTypeId}>{copy.failureType}</Label>
        <Input
          defaultValue={current?.failureType ?? ''}
          id={failureTypeId}
          name="failureType"
          placeholder={copy.failureTypeHint}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={noteId}>{copy.note}</Label>
        <TextArea
          defaultValue={current?.note ?? ''}
          id={noteId}
          maxLength={TRAJECTORY_NOTE_MAX_LENGTH}
          name="note"
          placeholder={copy.noteHint}
          rows={5}
        />
      </div>

      {error ? errorAlert : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={isBusy || verdict === null} size="sm" type="submit">
          {isSaving ? copy.saving : copy.save}
        </Button>
        {current ? removeButton : null}
      </div>
    </form>
  );
};
