import * as React from 'react';
import type { WorkspaceEditorId } from '~/__generated__/graphql';
import { PlanDeferredSection } from '~/routing/plans/components/PlanDeferredSection';
import { PlanEditorActions } from '~/routing/plans/components/PlanEditorActions';
import { PlanToolbarTagsSkeleton } from '~/routing/plans/components/PlanToolbarTagsSkeleton';
import { PLAN_DEFERRED_SECTION_COPY } from '~/routing/plans/data/data.copy';

export interface PlanToolbarEditorLinksProps {
  /** @description Editors enabled in workspace settings, as the loader's deferred promise. */
  readonly editors?: Promise<readonly WorkspaceEditorId[]>;
  readonly planId: string;
  readonly workingDirectory: string;
}

/**
 * @description The toolbar's editor deep-link region behind its own boundary.
 * Deep links are a convenience, so they must not hold up the toolbar's title,
 * status or Run/Queue controls — those render from critical loader data.
 */
export const PlanToolbarEditorLinks = (
  props: PlanToolbarEditorLinksProps,
): React.ReactElement | null => {
  const { editors, planId, workingDirectory } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (editors == null) return null;

  return (
    <PlanDeferredSection
      errorText={PLAN_DEFERRED_SECTION_COPY.editorsError}
      fallback={<PlanToolbarTagsSkeleton />}
      resolve={editors}
    >
      {(resolvedEditors) => (
        <PlanEditorActions
          editors={resolvedEditors}
          planId={planId}
          workingDirectory={workingDirectory}
        />
      )}
    </PlanDeferredSection>
  );
};
