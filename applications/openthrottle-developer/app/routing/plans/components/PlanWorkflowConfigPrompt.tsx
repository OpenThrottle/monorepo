import * as React from 'react';
import classnames from 'classnames';
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import { DEFAULT_RALPH_PROMPT } from '~/routing/plans/utils/build-workflow-ralph-argv';
import type { WorkflowRalphPromptLayer } from '~/routing/plans/utils/build-workflow-ralph-argv';

export interface PlanWorkflowConfigPromptProps {
  className?: string;
  onPromptChange: (next: string) => void;
  onPromptFileChange: (next: string) => void;
  onPromptLayerChange: (next: WorkflowRalphPromptLayer) => void;
  prompt: string;
  promptFile: string;
  promptLayer: WorkflowRalphPromptLayer;
}

export const PlanWorkflowConfigPrompt = (
  props: PlanWorkflowConfigPromptProps,
) => {
  const {
    className,
    onPromptChange,
    onPromptFileChange,
    onPromptLayerChange,
    prompt,
    promptFile,
    promptLayer,
  } = props;

  // Hooks

  // Setup

  // Handlers
  const handlePromptChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    onPromptChange(event.target.value);
  };

  const handlePromptFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    onPromptFileChange(event.target.value);
  };

  const handleLayerChange = (value: string): void => {
    if (value === 'named' || value === 'file') {
      onPromptLayerChange(value);
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="mt-8">
      <h2 className="pb-2 mb-4 flex gap-2">
        <b>Layer 1</b> — Prompt profile
      </h2>
      <div className="bg-card rounded-lg border border-card-border p-2 md:p-4">
        <fieldset
          aria-labelledby="workflow-run-layer1-legend"
          className={classnames('space-y-4', className)}
          data-testid="PlanWorkflowConfigPrompt"
        >
          <p className="text-muted-foreground text-xs">
            Named path (<code className="text-xs">--prompt</code>) vs UTF-8 file
            (<code className="text-xs">--prompt-file</code>) are mutually
            exclusive, same as{' '}
            <code className="text-xs">
              tools/workflows/src/utils/parsers.ts
            </code>
            . Default named profile:{' '}
            <code className="text-xs">{DEFAULT_RALPH_PROMPT}</code>.
          </p>
          <div className="space-y-2">
            <Label htmlFor="workflow-run-prompt-layer">Prompt source</Label>
            <Select onValueChange={handleLayerChange} value={promptLayer}>
              <SelectTrigger
                aria-describedby="workflow-run-prompt-layer-hint"
                className="max-w-md"
                id="workflow-run-prompt-layer"
              >
                <SelectValue placeholder="Prompt source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="named">Named profile (--prompt)</SelectItem>
                <SelectItem value="file">
                  Prompt file (--prompt-file)
                </SelectItem>
              </SelectContent>
            </Select>
            <p
              className="text-muted-foreground text-xs"
              id="workflow-run-prompt-layer-hint"
            >
              Maps to <code className="text-xs">WORKFLOW_RALPH_PROMPT</code> /{' '}
              <code className="text-xs">WORKFLOW_RALPH_PROMPT_FILE</code> when
              you do not pass CLI flags.{' '}
              <code className="text-xs">--prompt-stdin</code> is CLI-only (pipe
              stdin); use a terminal for that mode.
            </p>
          </div>

          {promptLayer === 'named' ? (
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
          ) : (
            <div className="space-y-2">
              <Label htmlFor="workflow-run-prompt-file">--prompt-file</Label>
              <Input
                aria-describedby="workflow-run-prompt-file-hint"
                aria-label="Path for --prompt-file"
                autoComplete="off"
                id="workflow-run-prompt-file"
                onChange={handlePromptFileChange}
                placeholder="e.g. prompts/local.md"
                spellCheck={false}
                value={promptFile}
              />
              <p
                className="text-muted-foreground text-xs"
                id="workflow-run-prompt-file-hint"
              >
                Repo-relative or absolute path; empty omits the flag (defaults
                come from env / .workflow-ralph.json).
              </p>
            </div>
          )}
        </fieldset>
      </div>
    </div>
  );
};
