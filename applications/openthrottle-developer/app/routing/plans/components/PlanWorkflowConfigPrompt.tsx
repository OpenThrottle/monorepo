import * as React from 'react';
import classnames from 'classnames';
import { Input, Label } from '@openthrottle/react-router-shadcn';
import { DEFAULT_RALPH_PROMPT } from '~/routing/plans/utils/build-workflow-ralph-argv';

export interface PlanWorkflowConfigPromptProps {
  readonly className?: string;
  readonly onPromptChange: (next: string) => void;
  readonly prompt: string;
}

export const PlanWorkflowConfigPrompt = (
  props: PlanWorkflowConfigPromptProps,
) => {
  const { className, onPromptChange, prompt } = props;

  // Hooks

  // Setup

  // Handlers
  const handlePromptChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    onPromptChange(event.target.value);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <fieldset
      aria-labelledby="workflow-run-layer1-legend"
      className={classnames(
        'space-y-3 rounded-md border border-border p-4',
        className,
      )}
      data-testid="PlanWorkflowConfigPrompt"
    >
      <legend
        className="px-1 text-sm font-medium text-foreground"
        id="workflow-run-layer1-legend"
      >
        Layer 1 — Prompt profile
      </legend>
      <p className="text-muted-foreground text-xs">
        How the model should approach the work (Cursor command or prompt path).
        Default matches CLI:{' '}
        <code className="text-xs">{DEFAULT_RALPH_PROMPT}</code>.
      </p>
      <div className="space-y-2">
        <Label htmlFor="workflow-run-prompt">--prompt</Label>
        <Input
          aria-describedby="workflow-run-prompt-hint"
          aria-label="Prompt profile for --prompt"
          autoComplete="off"
          id="workflow-run-prompt"
          onChange={handlePromptChange}
          placeholder={DEFAULT_RALPH_PROMPT}
          spellCheck={false}
          value={prompt}
        />
        <p
          className="text-muted-foreground text-xs"
          id="workflow-run-prompt-hint"
        >
          Omitted from the command when equal to the default.
        </p>
      </div>
    </fieldset>
  );
};
