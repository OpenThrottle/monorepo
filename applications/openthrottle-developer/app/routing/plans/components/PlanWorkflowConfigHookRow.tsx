import * as React from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import {
  Button,
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
  JobRunHookPhase,
} from '~/routing/plans/utils/job-run-hooks-ui';
import {
  isJobRunHookPhase,
  jobRunHookDefaultTimeoutHint,
  jobRunHookKindLabel,
  jobRunHookPhaseLabel,
} from '~/routing/plans/utils/job-run-hooks-ui';
import { DEFAULT_RALPH_PROMPT } from '~/routing/plans/utils/build-workflow-ralph-argv';
import {
  moveRowWithinPhase,
  updateRow,
} from '~/routing/plans/utils/job-run-hooks-draft';

export interface PlanWorkflowConfigHookRowProps {
  hooks: readonly JobRunHookDraftRow[];
  index: number;
  onChange: (next: JobRunHookDraftRow[]) => void;
  row: JobRunHookDraftRow;
}

export const PlanWorkflowConfigHookRow = (
  props: PlanWorkflowConfigHookRowProps,
): React.ReactElement => {
  const { hooks, index, onChange, row } = props;

  // Hooks

  // Setup
  const kindValue = row.kind === 'skill' ? 'skill' : 'prompt_profile';
  const onFailureValue = row.onFailure ?? 'default';
  const phaseIndices = hooks
    .map((r, i) => (r.phase === row.phase ? i : -1))
    .filter((i) => i >= 0);
  const posInPhase = phaseIndices.indexOf(index);
  const canMoveUp = posInPhase > 0;
  const canMoveDown = posInPhase < phaseIndices.length - 1;

  // Handlers
  const handleRemove = (draftId: string): void => {
    onChange(hooks.filter((r) => r.draftId !== draftId));
  };

  const handlePhaseChange = (draftId: string, phase: JobRunHookPhase): void => {
    onChange(updateRow(hooks, draftId, { phase }));
  };

  const handleKindChange = (
    draftId: string,
    kind: 'prompt_profile' | 'skill',
  ): void => {
    const target = hooks.find((r) => r.draftId === draftId);
    if (target == null) return;

    const shared = {
      draftId: target.draftId,
      onFailure: target.onFailure,
      order: target.order,
      phase: target.phase,
      timeoutSeconds: target.timeoutSeconds,
    };

    if (kind === 'skill') {
      onChange(
        hooks.map((r) =>
          r.draftId === draftId
            ? {
                ...shared,
                kind: 'skill' as const,
                skillPath: '.agents/skills/workflow-ralph/SKILL.md',
              }
            : r,
        ),
      );
      return;
    }

    onChange(
      hooks.map((r) =>
        r.draftId === draftId
          ? {
              ...shared,
              kind: 'prompt_profile' as const,
              prompt: DEFAULT_RALPH_PROMPT,
              promptDelivery: 'named' as const,
            }
          : r,
      ),
    );
  };

  const handleOnFailureChange = (
    draftId: string,
    onFailure: JobRunHookOnFailure | 'default',
  ): void => {
    onChange(
      updateRow(hooks, draftId, {
        onFailure: onFailure === 'default' ? undefined : onFailure,
      }),
    );
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  return (
    <li
      className="border-border space-y-3 rounded-lg border p-4"
      data-testid={`job-run-hook-row-${index}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Hook {index + 1}</span>

        <div className="flex items-center gap-1">
          <Button
            aria-label="Move hook up within phase"
            disabled={!canMoveUp}
            onClick={() => onChange(moveRowWithinPhase(hooks, row.draftId, -1))}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ArrowUp />
          </Button>
          <Button
            aria-label="Move hook down within phase"
            disabled={!canMoveDown}
            onClick={() => onChange(moveRowWithinPhase(hooks, row.draftId, 1))}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ArrowDown />
          </Button>
          <Button
            aria-label="Remove hook"
            onClick={() => handleRemove(row.draftId)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor={`hook-phase-${row.draftId}`}>Phase</Label>
          <Select
            onValueChange={(value) => {
              if (isJobRunHookPhase(value)) {
                handlePhaseChange(row.draftId, value);
              }
            }}
            value={row.phase}
          >
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
          <Select
            onValueChange={(value) =>
              handleKindChange(row.draftId, value as 'prompt_profile' | 'skill')
            }
            value={kindValue}
          >
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
          <Select
            onValueChange={(value) =>
              handleOnFailureChange(
                row.draftId,
                value as JobRunHookOnFailure | 'default',
              )
            }
            value={onFailureValue}
          >
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
            onChange={(event) => {
              const raw = event.target.value.trim();
              onChange(
                updateRow(hooks, row.draftId, {
                  timeoutSeconds:
                    raw === '' ? undefined : Number.parseInt(raw, 10),
                }),
              );
            }}
            placeholder={jobRunHookDefaultTimeoutHint()}
            type="number"
            value={
              row.timeoutSeconds === undefined ? '' : String(row.timeoutSeconds)
            }
          />
        </div>
      </div>

      {row.kind === 'skill' ? (
        <div className="space-y-2">
          <Label htmlFor={`hook-skill-${row.draftId}`}>Skill path</Label>
          <Input
            id={`hook-skill-${row.draftId}`}
            onChange={(event) =>
              onChange(
                updateRow(hooks, row.draftId, {
                  skillPath: event.target.value,
                }),
              )
            }
            placeholder=".agents/skills/workflow-ralph/SKILL.md"
            spellCheck={false}
            value={row.skillPath}
          />
        </div>
      ) : row.promptDelivery === 'file' ? (
        <div className="space-y-2">
          <Label htmlFor={`hook-prompt-file-${row.draftId}`}>Prompt file</Label>
          <Input
            id={`hook-prompt-file-${row.draftId}`}
            onChange={(event) =>
              onChange(
                updateRow(hooks, row.draftId, {
                  promptFile: event.target.value,
                }),
              )
            }
            placeholder="prompts/preflight.md"
            spellCheck={false}
            value={row.promptFile}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor={`hook-prompt-${row.draftId}`}>
                Named prompt (--prompt)
              </Label>
              <Input
                id={`hook-prompt-${row.draftId}`}
                onChange={(event) =>
                  onChange(
                    updateRow(hooks, row.draftId, {
                      prompt: event.target.value,
                    }),
                  )
                }
                placeholder={DEFAULT_RALPH_PROMPT}
                spellCheck={false}
                value={row.prompt}
              />
            </div>
            <Button
              onClick={() =>
                onChange(
                  hooks.map((r) =>
                    r.draftId === row.draftId
                      ? {
                          draftId: r.draftId,
                          kind: 'prompt_profile' as const,
                          onFailure: r.onFailure,
                          order: r.order,
                          phase: r.phase,
                          promptDelivery: 'file' as const,
                          promptFile: '',
                          timeoutSeconds: r.timeoutSeconds,
                        }
                      : r,
                  ),
                )
              }
              size="sm"
              type="button"
              variant="outline"
            >
              Use file
            </Button>
          </div>
        </div>
      )}

      {row.kind === 'prompt_profile' && row.promptDelivery === 'file' ? (
        <Button
          onClick={() =>
            onChange(
              hooks.map((r) =>
                r.draftId === row.draftId
                  ? {
                      draftId: r.draftId,
                      kind: 'prompt_profile' as const,
                      onFailure: r.onFailure,
                      order: r.order,
                      phase: r.phase,
                      prompt: DEFAULT_RALPH_PROMPT,
                      promptDelivery: 'named' as const,
                      timeoutSeconds: r.timeoutSeconds,
                    }
                  : r,
              ),
            )
          }
          size="sm"
          type="button"
          variant="ghost"
        >
          Use named profile
        </Button>
      ) : null}
    </li>
  );
};
