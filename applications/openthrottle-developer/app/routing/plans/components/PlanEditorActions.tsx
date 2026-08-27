import * as React from 'react';
import clsx from 'clsx';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { SquareArrowOutUpRight } from 'lucide-react';
import { getWorkspaceEditorDeepLink } from '~/global/config/workspace-editor-deep-links';
import { PLAN_EDITOR_ACTIONS_COPY } from '~/routing/plans/data/data.copy';
import type { WorkspaceEditorId } from '~/__generated__/graphql';

export interface PlanEditorActionsProps {
  className?: string;
  /**
   * @description Editors the user enabled in workspace settings. One button per
   * editor whose deep link resolves.
   */
  editors: readonly WorkspaceEditorId[];
  planId: string;
  /**
   * @description Absolute path; the run-config working directory or the selected
   * checkout's filesystemPath. Empty when neither resolved.
   */
  workingDirectory: string;
}

/**
 * @description "Open this plan in my editor" deep links for the plan toolbar —
 * one button per enabled editor, each landing in the plan's checkout with the
 * prompt to run the plan already typed.
 *
 * An editor whose link cannot be built (it needs a folder and the plan has no
 * checkout selected) renders **disabled with a tooltip naming the fix**, not
 * omitted. Never render a dead or guessed link — but absence alone is
 * indistinguishable from a broken feature, so say why the button is inert.
 * Renders nothing only when no enabled editor is recognized at all.
 *
 * Rendered through `OpenThrottleToolbar`'s dedicated `editorActions` slot rather
 * than folded into `utilityContent`, which already holds the CLI-preview link.
 * The slot is optional, so `PlanTaskToolbar` — which shares the skeleton — is
 * untouched.
 */
export const PlanEditorActions = (
  props: PlanEditorActionsProps,
): React.ReactElement | null => {
  const { className, editors, planId, workingDirectory } = props;

  // Hooks

  // Setup
  // A null href means the editor is supported but its precondition is unmet
  // (it needs a folder and none resolved). Those render disabled with a tooltip
  // rather than vanishing — silent absence reads as "the feature is broken".
  const targets = editors
    .map((editor) => {
      const target = getWorkspaceEditorDeepLink(editor);

      if (target === null) {
        return null;
      }

      return {
        href: target.buildPlanHref({ planId, workingDirectory }),
        target,
      };
    })
    .filter((entry) => entry !== null);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (targets.length === 0) {
    return null;
  }

  return (
    <div
      className={clsx('flex flex-wrap items-center gap-2', className)}
      data-testid="PlanEditorActions"
    >
      {targets.map(({ href, target }) => {
        const label = (
          <>
            <SquareArrowOutUpRight aria-hidden={true} className="size-3" />
            {target.label}
          </>
        );

        return (
          <Tooltip delayDuration={1_000} key={target.label}>
            <TooltipTrigger asChild={true}>
              {href === null ? (
                // The span carries the pointer events a disabled button cannot,
                // so the tooltip explaining WHY still opens.
                <span
                  className="inline-flex"
                  data-testid={`PlanEditorActions-disabled-${target.label}`}
                >
                  <Button disabled={true} size="sm" variant="outline">
                    {label}
                  </Button>
                </span>
              ) : (
                <Button asChild={true} size="sm" variant="outline">
                  <a href={href}>{label}</a>
                </Button>
              )}
            </TooltipTrigger>
            <TooltipContent className="max-w-xs" side="top">
              {href === null
                ? PLAN_EDITOR_ACTIONS_COPY.needsCheckoutTooltip(target.label)
                : target.promptTargetsFocusedWindow
                  ? PLAN_EDITOR_ACTIONS_COPY.focusedWindowTooltip(target.label)
                  : PLAN_EDITOR_ACTIONS_COPY.openTooltip(target.label)}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};
