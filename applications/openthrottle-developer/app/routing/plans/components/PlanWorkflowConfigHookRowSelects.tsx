import * as React from 'react';
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import type {
  JobRunHookDraftRow,
  JobRunHookOnFailure,
} from '~/routing/plans/utils/job-run-hooks-ui';
import {
  jobRunHookDefaultTimeoutHint,
  jobRunHookKindLabel,
  jobRunHookPhaseLabel,
} from '~/routing/plans/utils/job-run-hooks-ui';

export interface PlanWorkflowConfigHookRowSelectsProps {
  readonly kindValue: 'prompt_profile' | 'skill';
  readonly onFailureChange: (value: string) => void;
  readonly onFailureValue: JobRunHookOnFailure | 'default';
  readonly onKindChange: (value: string) => void;
  readonly onPhaseChange: (value: string) => void;
  readonly onTimeoutChange: React.ChangeEventHandler<HTMLInputElement>;
  readonly row: JobRunHookDraftRow;
}

/**
 * @description The phase / kind / on-failure / timeout field grid for one
 * {@link PlanWorkflowConfigHookRow}.
 */
export const PlanWorkflowConfigHookRowSelects = (
  props: PlanWorkflowConfigHookRowSelectsProps,
): React.ReactElement => {
  const {
    kindValue,
    onFailureChange,
    onFailureValue,
    onKindChange,
    onPhaseChange,
    onTimeoutChange,
    row,
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2">
        <Label htmlFor={`hook-phase-${row.draftId}`}>Phase</Label>
        <Select onValueChange={onPhaseChange} value={row.phase}>
          <SelectTrigger id={`hook-phase-${row.draftId}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="before_run">
              {jobRunHookPhaseLabel('before_run')}
            </SelectItem>
            <SelectItem value="after_run">
              {jobRunHookPhaseLabel('after_run')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`hook-kind-${row.draftId}`}>Kind</Label>
        <Select onValueChange={onKindChange} value={kindValue}>
          <SelectTrigger id={`hook-kind-${row.draftId}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="prompt_profile">
              {jobRunHookKindLabel('prompt_profile')}
            </SelectItem>
            <SelectItem value="skill">
              {jobRunHookKindLabel('skill')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`hook-on-failure-${row.draftId}`}>On failure</Label>
        <Select onValueChange={onFailureChange} value={onFailureValue}>
          <SelectTrigger id={`hook-on-failure-${row.draftId}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">
              Default ({row.phase === 'before_run' ? 'block' : 'warn'})
            </SelectItem>
            <SelectItem value="block">block</SelectItem>
            <SelectItem value="warn">warn</SelectItem>
            <SelectItem value="ignore">ignore</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`hook-timeout-${row.draftId}`}>Timeout (s)</Label>
        <Input
          id={`hook-timeout-${row.draftId}`}
          min={1}
          onChange={onTimeoutChange}
          placeholder={jobRunHookDefaultTimeoutHint()}
          type="number"
          value={
            row.timeoutSeconds === undefined ? '' : String(row.timeoutSeconds)
          }
        />
      </div>
    </div>
  );
};
