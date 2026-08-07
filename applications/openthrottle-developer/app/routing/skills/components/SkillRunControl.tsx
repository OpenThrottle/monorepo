import * as React from 'react';
import { Await } from 'react-router';
import type { ChatModelOption } from '@openthrottle/react-router-chat';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import type { RepositoryOption } from '~/routing/home/data/models.server';
import { RunSkillDialog } from '~/routing/skills/components/RunSkillDialog';
import type { RunSkillPayload } from '~/routing/skills/components/RunSkillDialog';
import { SKILL_RUN_COPY } from '~/routing/skills/data/data.copy';

/** Deferred bundle the loader streams for the Run-skill modal. */
export interface RunSkillRunOptions {
  readonly models: ChatModelOption[];
  readonly repositories: RepositoryOption[];
}

export interface SkillRunControlProps {
  readonly entry: RepoSkillEntry;
  /** Composed run payload from the modal; wired to the run mechanism. */
  readonly onRun?: (payload: RunSkillPayload) => void;
  /** Deferred agent+model+repository options for the modal. */
  readonly runOptions?: Promise<RunSkillRunOptions>;
}

/**
 * @description The skill detail header's "Run now" affordance: the trigger button
 * plus the {@link RunSkillDialog} it opens. Running composes a `/<slug>` message
 * sent THROUGH an agent/model, so a skill whose effective model-invocation is
 * disabled shows a disabled button with an explanatory tooltip. The modal's
 * deferred options resolve on demand behind a Suspense boundary.
 */
export const SkillRunControl = (
  props: SkillRunControlProps,
): React.ReactElement => {
  const { entry, onRun, runOptions } = props;

  // Hooks
  const [open, setOpen] = React.useState(false);

  // Setup
  const runDisabled =
    (entry.effectiveDisableModelInvocation ??
      entry.disableModelInvocation ??
      false) === true;

  // Handlers
  const handleRun = (payload: RunSkillPayload): void => {
    setOpen(false);
    onRun?.(payload);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (runDisabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild={true}>
          <span>
            <Button
              data-testid="skill-run-now"
              disabled={true}
              size="xs"
              variant="outline"
            >
              {SKILL_RUN_COPY.runButtonLabel}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs" side="top">
          {SKILL_RUN_COPY.triggerDisabledTooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <>
      <Button
        data-testid="skill-run-now"
        onClick={() => setOpen(true)}
        size="xs"
        variant="outline"
      >
        {SKILL_RUN_COPY.runButtonLabel}
      </Button>

      {/* Deferred: the modal needs the streamed agent+model+repository options.
          Mounted only while open so discovery resolves on demand; once resolved
          it renders instantly (RR8 streams the loader promise at page load). */}
      {open && runOptions != null ? (
        <React.Suspense fallback={null}>
          <Await resolve={runOptions}>
            {(data) => (
              <RunSkillDialog
                models={data.models}
                onOpenChange={setOpen}
                onRun={handleRun}
                open={open}
                repositories={data.repositories}
                slug={entry.slug}
              />
            )}
          </Await>
        </React.Suspense>
      ) : null}
    </>
  );
};
