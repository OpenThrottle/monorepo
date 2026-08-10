import * as React from 'react';
import {
  ChatCheckoutSelector,
  ChatModelPicker,
  type ChatModelOption,
} from '@openthrottle/react-router-chat';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  TextArea,
} from '@openthrottle/react-router-shadcn';
import type { SkillArgument } from '@openthrottle/openthrottle-skills';
import { useNavigate } from 'react-router';
import type { RepositoryOption } from '~/routing/home/data/models.server';
import { RunSkillArgumentField } from '~/routing/skills/components/RunSkillArgumentField';
import { SKILL_RUN_COPY } from '~/routing/skills/data/data.copy';
import {
  useRunSkillDialog,
  type RunSkillPayload,
} from '~/routing/skills/hooks/useRunSkillDialog';

export type { RunSkillPayload };

export interface RunSkillDialogProps {
  /**
   * Typed argument declarations from the skill frontmatter. When present, the
   * modal renders one control per argument; when absent, the free-text field.
   */
  readonly argumentDeclarations?: readonly SkillArgument[];
  /** Discovered agent+model options (local endpoints + agent CLIs + driver×endpoint). */
  readonly models: ChatModelOption[];
  readonly onOpenChange: (open: boolean) => void;
  /** Called with the composed invocation when the user clicks Run. */
  readonly onRun: (payload: RunSkillPayload) => void;
  readonly open: boolean;
  /** Registered local checkouts satisfying `repositoryId` for CLI backends. */
  readonly repositories: RepositoryOption[];
  /** Slug of the skill being run; composed into the `/<slug>` command. */
  readonly slug: string;
}

/**
 * @description Controlled "Run skill" modal for the /skills/:slug detail route.
 * Presents the grouped agent+model picker, an optional free-text Arguments
 * field, and (for CLI backends only) a repository/checkout picker, then composes
 * a `/<slug> <args>` invocation the caller streams via the shared chat path.
 * Presentational — all picker state and payload composition live in
 * {@link useRunSkillDialog}; the caller owns the run.
 */
export const RunSkillDialog = (
  props: RunSkillDialogProps,
): React.ReactElement => {
  const {
    argumentDeclarations: argumentDeclarationsProp,
    models,
    onOpenChange,
    onRun,
    open,
    repositories,
    slug,
  } = props;

  // Hooks
  const navigate = useNavigate();
  const {
    args,
    argumentDeclarations,
    argumentValues,
    buildPayload,
    checkouts,
    hasArgumentDeclarations,
    hasModels,
    isCliBackend,
    modelGroups,
    modelId,
    repositoryId,
    setArgs,
    setArgumentValue,
    setModelId,
    setRepositoryId,
    submitDisabled,
  } = useRunSkillDialog({
    argumentDeclarations: argumentDeclarationsProp,
    models,
    open,
    repositories,
    slug,
  });

  // Setup
  const copy = SKILL_RUN_COPY;

  // Handlers
  const handleRun = (): void => {
    const payload = buildPayload();
    if (payload === null) {
      return;
    }

    onRun(payload);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent data-testid="RunSkillDialog">
        <DialogHeader>
          <DialogTitle>
            {copy.dialogTitle}: <span className="font-mono">/{slug}</span>
          </DialogTitle>
          <DialogDescription>{copy.dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{copy.modelLabel}</Label>
            {hasModels ? (
              <div>
                <ChatModelPicker
                  groups={modelGroups}
                  models={models}
                  onModelChange={setModelId}
                  onOpenSettings={() => {
                    onOpenChange(false);
                    navigate('/settings/agents');
                  }}
                  selectedModelId={modelId}
                />
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {copy.noModelsNotice}
              </p>
            )}
          </div>

          {isCliBackend ? (
            <div className="flex flex-col gap-1.5">
              <Label>{copy.repositoryLabel}</Label>
              <div>
                <ChatCheckoutSelector
                  checkouts={checkouts}
                  onCheckoutChange={setRepositoryId}
                  selectedCheckoutId={repositoryId}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                {copy.repositoryHint}
              </p>
            </div>
          ) : null}

          {hasArgumentDeclarations ? (
            <div className="flex flex-col gap-4">
              {argumentDeclarations.map((declaration) => (
                <RunSkillArgumentField
                  declaration={declaration}
                  key={declaration.name}
                  onChange={(value) =>
                    setArgumentValue(declaration.name, value)
                  }
                  value={argumentValues[declaration.name] ?? ''}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="run-skill-arguments">{copy.argumentsLabel}</Label>
              <TextArea
                id="run-skill-arguments"
                onChange={(event) => setArgs(event.target.value)}
                placeholder={copy.argumentsPlaceholder}
                value={args}
              />
              <p className="text-muted-foreground text-xs">
                {copy.argumentsHint}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="ghost"
          >
            {copy.cancelLabel}
          </Button>
          <Button disabled={submitDisabled} onClick={handleRun} type="button">
            {copy.runLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
