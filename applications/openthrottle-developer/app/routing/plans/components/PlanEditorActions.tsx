import {
  Button,
  cn,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { CodeXmlIcon } from 'lucide-react';
import * as React from 'react';

import type { WorkspaceEditorId } from '~/__generated__/graphql';
import { getWorkspaceEditorDeepLink } from '~/global/config/workspace-editor-deep-links';
import { useDefaultEditor } from '~/global/hooks/useDefaultEditor';
import { orderEditorsDefaultFirst } from '~/global/utils/orderEditorsDefaultFirst';
import { PlanDeferredSection } from '~/routing/plans/components/PlanDeferredSection';
import { PlanToolbarTagsSkeleton } from '~/routing/plans/components/PlanToolbarTagsSkeleton';
import { PLAN_DEFERRED_SECTION_COPY } from '~/routing/plans/data/data.copy';
import { getPlanEditorTooltip } from '~/routing/plans/utils/getPlanEditorTooltip';

export interface PlanEditorActionsProps {
  className?: string;
  /**
   * @description Editors enabled in workspace settings, as the loader's deferred
   * promise; empty renders none. Deep links are a convenience, so they get their
   * own boundary rather than holding up the toolbar's Run/Queue controls.
   */
  editors?: Promise<readonly WorkspaceEditorId[]>;
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
 * prompt to run the plan already typed. The user's default editor renders
 * first when it is enabled.
 *
 * An editor whose link cannot be built (it needs a folder and the plan has no
 * checkout selected) renders **disabled with a tooltip naming the fix**, not
 * omitted. Never render a dead or guessed link — but absence alone is
 * indistinguishable from a broken feature, so say why the button is inert.
 * Renders nothing only when no enabled editor is recognized at all.
 *
 * The enabled-editors list streams in behind {@link PlanDeferredSection}, so
 * the rest of the toolbar paints from critical data. Rendered through
 * `OpenThrottleToolbar`'s dedicated `editorActions` slot rather than folded
 * into `utilityContent`, which already holds the CLI-preview link. The slot is
 * optional, so `PlanTaskToolbar` — which shares the skeleton — is untouched.
 */
export const PlanEditorActions = (
  props: PlanEditorActionsProps,
): React.ReactElement | null => {
  const { className, editors, planId, workingDirectory } = props;

  // Hooks
  const defaultEditor = useDefaultEditor();

  // Setup

  // Handlers

  // Markup
  const renderTrigger = (
    href: string | null,
    editorLabel: string,
    label: React.ReactNode,
  ): React.ReactElement => {
    if (href === null) {
      // The span carries the pointer events a disabled button cannot, so the
      // tooltip explaining WHY still opens.
      return (
        <span
          className="inline-flex"
          data-testid={`PlanEditorActions-disabled-${editorLabel}`}
        >
          <Button disabled={true} size="xs" variant="outline">
            {label}
          </Button>
        </span>
      );
    }

    return (
      <Button asChild={true} size="xs" variant="outline">
        <a href={href}>{label}</a>
      </Button>
    );
  };

  const renderResolved = (
    resolvedEditors: readonly WorkspaceEditorId[],
  ): React.ReactNode => {
    // A null href means the editor is supported but its precondition is unmet
    // (it needs a folder and none resolved). Those render disabled with a tooltip
    // rather than vanishing — silent absence reads as "the feature is broken".
    // The default editor leads the group (D5); it is never added when disabled.
    const targets = orderEditorsDefaultFirst(resolvedEditors, defaultEditor)
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

    if (targets.length === 0) {
      return null;
    }

    return (
      <div
        className={cn('flex flex-wrap items-center gap-2', className)}
        data-testid="PlanEditorActions"
      >
        {targets.map(({ href, target }) => {
          const label = (
            <div className="flex items-center gap-2">
              <CodeXmlIcon aria-hidden={true} className="size-2.5" />
              {target.label}
            </div>
          );

          return (
            <Tooltip delayDuration={1_000} key={target.label}>
              <TooltipTrigger asChild={true}>
                {renderTrigger(href, target.label, label)}
              </TooltipTrigger>
              <TooltipContent className="max-w-xs" side="top">
                {getPlanEditorTooltip({
                  href,
                  label: target.label,
                  promptTargetsFocusedWindow: target.promptTargetsFocusedWindow,
                })}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  };

  // Life Cycle

  // 🔌 Short Circuit
  if (editors == null) {
    return null;
  }

  return (
    <PlanDeferredSection
      errorText={PLAN_DEFERRED_SECTION_COPY.editorsError}
      fallback={<PlanToolbarTagsSkeleton />}
      resolve={editors}
    >
      {renderResolved}
    </PlanDeferredSection>
  );
};
