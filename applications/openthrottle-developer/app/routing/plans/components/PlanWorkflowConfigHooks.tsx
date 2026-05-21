import * as React from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
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
  createDefaultJobRunHookDraftRow,
  jobRunHookDefaultTimeoutHint,
  jobRunHookKindLabel,
  jobRunHookPhaseLabel,
  validateJobRunHooksDraftRows,
} from '~/routing/plans/utils/job-run-hooks-ui';
import { DEFAULT_RALPH_PROMPT } from '~/routing/plans/utils/build-workflow-ralph-argv';
import { PlanWorkflowConfigHooksValidation } from '~/routing/plans/components/PlanWorkflowConfigHooksValidation';
import { PlanWorkflowConfigHooksEmpty } from '~/routing/plans/components/PlanWorkflowConfigHooksEmpty';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';

export interface PlanWorkflowConfigHooksProps {
  heading: string;
  hooks: readonly JobRunHookDraftRow[];
  onChange: (next: JobRunHookDraftRow[]) => void;
  /**
   * @description When set, shows Save to plan (persists via parent fetcher).
   */
  onSave: () => void;
  saveDisabled?: boolean;
  savePending?: boolean;
}

const updateRow = (
  rows: readonly JobRunHookDraftRow[],
  draftId: string,
  patch: Partial<JobRunHookDraftRow>,
): JobRunHookDraftRow[] =>
  rows.map((row) =>
    row.draftId === draftId ? { ...row, ...patch } : row,
  ) as JobRunHookDraftRow[];

const moveRowWithinPhase = (
  rows: readonly JobRunHookDraftRow[],
  draftId: string,
  direction: -1 | 1,
): JobRunHookDraftRow[] => {
  const index = rows.findIndex((r) => r.draftId === draftId);
  if (index < 0) return [...rows];

  const phase = rows[index].phase;
  const phaseIndices = rows
    .map((r, i) => (r.phase === phase ? i : -1))
    .filter((i) => i >= 0);
  const posInPhase = phaseIndices.indexOf(index);
  const swapPos = posInPhase + direction;
  if (swapPos < 0 || swapPos >= phaseIndices.length) {
    return [...rows];
  }

  const swapIndex = phaseIndices[swapPos];
  const next = [...rows];
  const current = next[index];

  next[index] = next[swapIndex];
  next[swapIndex] = current;

  return next;
};

export const PlanWorkflowConfigHooks = (
  props: PlanWorkflowConfigHooksProps,
) => {
  const {
    heading,
    hooks,
    onChange,
    onSave,
    saveDisabled = false,
    savePending = false,
  } = props;

  const validation = validateJobRunHooksDraftRows(hooks);

  const handleAdd = (): void => {
    onChange([...hooks, createDefaultJobRunHookDraftRow()]);
  };

  const handleRemove = (draftId: string): void => {
    onChange(hooks.filter((row) => row.draftId !== draftId));
  };

  const handlePhaseChange = (draftId: string, phase: JobRunHookPhase): void => {
    onChange(updateRow(hooks, draftId, { phase }));
  };

  const handleKindChange = (
    draftId: string,
    kind: 'prompt_profile' | 'skill',
  ): void => {
    const row = hooks.find((r) => r.draftId === draftId);
    if (row == null) return;

    const shared = {
      draftId: row.draftId,
      onFailure: row.onFailure,
      order: row.order,
      phase: row.phase,
      timeoutSeconds: row.timeoutSeconds,
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

  return (
    <>
      <OpenThrottleFieldset id="job-run-hooks-legend" legend={heading}>
        <div className="pb-2 mb-4 flex flex-row flex-wrap items-center justify-between gap-4">
          <p className="text-muted-foreground text-xs font-normal">
            Run a prompt profile or repo skill before or after the main Ralph
            job (server-side; not CLI flags). Saved on the plan and sent on
            enqueue.
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              data-testid="job-run-hooks-add"
              onClick={handleAdd}
              size="sm"
              type="button"
              variant="outline"
            >
              <Plus />
              Add hook
            </Button>
            <Button
              data-testid="job-run-hooks-save"
              disabled={saveDisabled || !validation.ok || savePending}
              onClick={onSave}
              size="sm"
              type="button"
            >
              {savePending ? 'Saving…' : 'Save to plan'}
            </Button>
          </div>
        </div>
      </OpenThrottleFieldset>

      <fieldset
        className="space-y-4 ml-4"
        data-testid="PlanWorkflowConfigHooks"
      >
        <PlanWorkflowConfigHooksValidation validation={validation} />
        {hooks.length === 0 ? (
          <PlanWorkflowConfigHooksEmpty />
        ) : (
          <ul className="space-y-4">
            {hooks.map((row, index) => {
              const kindValue =
                row.kind === 'skill' ? 'skill' : 'prompt_profile';
              const onFailureValue = row.onFailure ?? 'default';
              const phaseIndices = hooks
                .map((r, i) => (r.phase === row.phase ? i : -1))
                .filter((i) => i >= 0);
              const posInPhase = phaseIndices.indexOf(index);
              const canMoveUp = posInPhase > 0;
              const canMoveDown = posInPhase < phaseIndices.length - 1;

              return (
                <li
                  className="rounded-lg border border-border p-4 space-y-3"
                  data-testid={`job-run-hook-row-${index}`}
                  key={row.draftId}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      Hook {index + 1}
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        aria-label="Move hook up within phase"
                        disabled={!canMoveUp}
                        onClick={() =>
                          onChange(moveRowWithinPhase(hooks, row.draftId, -1))
                        }
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        aria-label="Move hook down within phase"
                        disabled={!canMoveDown}
                        onClick={() =>
                          onChange(moveRowWithinPhase(hooks, row.draftId, 1))
                        }
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
                        onValueChange={(value) =>
                          handlePhaseChange(
                            row.draftId,
                            value as JobRunHookPhase,
                          )
                        }
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
                          handleKindChange(
                            row.draftId,
                            value as 'prompt_profile' | 'skill',
                          )
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
                      <Label htmlFor={`hook-on-failure-${row.draftId}`}>
                        On failure
                      </Label>
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
                            Default (
                            {row.phase === 'before_run' ? 'block' : 'warn'})
                          </SelectItem>
                          <SelectItem value="block">block</SelectItem>
                          <SelectItem value="warn">warn</SelectItem>
                          <SelectItem value="ignore">ignore</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`hook-timeout-${row.draftId}`}>
                        Timeout (s)
                      </Label>
                      <Input
                        id={`hook-timeout-${row.draftId}`}
                        min={1}
                        onChange={(event) => {
                          const raw = event.target.value.trim();
                          onChange(
                            updateRow(hooks, row.draftId, {
                              timeoutSeconds:
                                raw === ''
                                  ? undefined
                                  : Number.parseInt(raw, 10),
                            }),
                          );
                        }}
                        placeholder={jobRunHookDefaultTimeoutHint()}
                        type="number"
                        value={
                          row.timeoutSeconds === undefined
                            ? ''
                            : String(row.timeoutSeconds)
                        }
                      />
                    </div>
                  </div>

                  {row.kind === 'skill' ? (
                    <div className="space-y-2">
                      <Label htmlFor={`hook-skill-${row.draftId}`}>
                        Skill path
                      </Label>
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
                      <Label htmlFor={`hook-prompt-file-${row.draftId}`}>
                        Prompt file
                      </Label>
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

                  {row.kind === 'prompt_profile' &&
                  row.promptDelivery === 'file' ? (
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
            })}
          </ul>
        )}
      </fieldset>
    </>
  );
};
