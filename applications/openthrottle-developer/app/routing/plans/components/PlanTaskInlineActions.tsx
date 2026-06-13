import * as React from 'react';
import { Link } from 'react-router';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@openthrottle/react-router-shadcn';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';
import { parseRequirementsList } from '~/routing/plans/utils/formatters';

export interface PlanTaskInlineActionsProps {
  task: PlanTaskRowFragment;
}

/**
 * @description View + Details popover shared by the tasks table actions column and board cards.
 */
export const PlanTaskInlineActions = (
  props: PlanTaskInlineActionsProps,
): React.ReactElement => {
  const { task } = props;

  // Hooks

  // Setup
  const anchor = `#task-${task.id}`;
  const title = task.title ?? 'Untitled';
  const description = task.description?.trim() ?? '';
  const summary = task.summary?.trim() ?? '';

  const requirementsList = parseRequirementsList(task.requirementsJson);
  const hasDetails =
    description.length > 0 || summary.length > 0 || requirementsList.length > 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex items-center gap-2">
      <Link
        aria-label={`View task: ${title}`}
        className="hover:text-primary text-xs underline underline-offset-2"
        to={anchor}
        viewTransition={true}
      >
        View
      </Link>

      {hasDetails ? (
        <Popover>
          <PopoverTrigger
            aria-label={`View full details for task: ${title}`}
            className="hover:text-primary text-xs underline underline-offset-2"
          >
            Details
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="flex max-h-[min(60vh,400px)] w-96 flex-col overflow-hidden"
          >
            <div className="space-y-3 overflow-y-auto pr-1">
              {description ? (
                <section>
                  <h3 className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                    Description
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">{description}</p>
                </section>
              ) : null}

              {summary ? (
                <section>
                  <h3 className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                    Summary
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">{summary}</p>
                </section>
              ) : null}

              {requirementsList.length > 0 ? (
                <section>
                  <h3 className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                    Requirements
                  </h3>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {requirementsList.map((label, index) => (
                      <li key={index}>{label}</li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
};
