/**
 * @description Editors the user enabled in workspace settings, for the plan
 * toolbar's "open this plan in my editor" deep links. Hoisted out of the
 * plans.$planId._index route per route-primitive-shape R3.
 */

import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { PlanDetailWorkspaceEditorsDocument } from '~/__generated__/graphql';
import type { WorkspaceEditorId } from '~/__generated__/graphql';

/**
 * @description Reads the user's enabled editors, degrading to none on failure.
 * The links are a convenience, so a workspace-settings error must not take the
 * plan page down with it — the same rule `plans.create.tsx` documents.
 */
export const loadEnabledEditors = async (
  request: Request,
): Promise<readonly WorkspaceEditorId[]> => {
  try {
    const data = await executeGraphqlWithAuth(
      request,
      PlanDetailWorkspaceEditorsDocument,
    );

    return data.workspaceSettings.profile.enabledEditors;
  } catch {
    return [];
  }
};
