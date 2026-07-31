import * as React from 'react';
import { Button, Input, Label } from '@openthrottle/react-router-shadcn';
import { DEFAULT_RALPH_PROMPT } from '~/routing/plans/utils/build-workflow-ralph-argv';
import type { JobRunHookDraftRow } from '~/routing/plans/utils/job-run-hooks-ui';

export interface PlanWorkflowConfigHookRowPromptProps {
  readonly onPromptChange: React.ChangeEventHandler<HTMLInputElement>;
  readonly onPromptFileChange: React.ChangeEventHandler<HTMLInputElement>;
  readonly onSkillPathChange: React.ChangeEventHandler<HTMLInputElement>;
  readonly onUseFileDelivery: () => void;
  readonly onUseNamedProfile: () => void;
  readonly row: JobRunHookDraftRow;
}

/**
 * @description The kind-dependent payload fields for one
 * {@link PlanWorkflowConfigHookRow}: skill path for skill hooks, or the named
 * prompt / prompt file inputs (with the delivery toggle) for prompt-profile
 * hooks.
 */
export const PlanWorkflowConfigHookRowPrompt = (
  props: PlanWorkflowConfigHookRowPromptProps,
): React.ReactElement => {
  const {
    onPromptChange,
    onPromptFileChange,
    onSkillPathChange,
    onUseFileDelivery,
    onUseNamedProfile,
    row,
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      {row.kind === 'skill' ? (
        <div className="space-y-2">
          <Label htmlFor={`hook-skill-${row.draftId}`}>Skill path</Label>
          <Input
            id={`hook-skill-${row.draftId}`}
            onChange={onSkillPathChange}
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
            onChange={onPromptFileChange}
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
                onChange={onPromptChange}
                placeholder={DEFAULT_RALPH_PROMPT}
                spellCheck={false}
                value={row.prompt}
              />
            </div>
            <Button
              onClick={onUseFileDelivery}
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
          onClick={onUseNamedProfile}
          size="sm"
          type="button"
          variant="ghost"
        >
          Use named profile
        </Button>
      ) : null}
    </>
  );
};
