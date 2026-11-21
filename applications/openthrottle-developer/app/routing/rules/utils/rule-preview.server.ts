import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';

import type { TagActionRuleRowFragment } from '~/__generated__/graphql';
import { RulePreviewDocument } from '~/__generated__/graphql';
import type { RulePreviewState } from '~/routing/rules/types';
import type { RulePreviewRequest } from '~/routing/rules/utils/rule-preview-params';

/**
 * @description Runs the read-only `previewTagActionRule` dry run for one rule's match fields. Only
 * the match fields travel: the server ignores the placeholder title and payload, so a rule that is
 * still being edited previews fine. A failure (server down, no user identity) degrades to an error
 * state rather than throwing into the form or the detail page.
 */
export const loadRulePreview = async (
  request: Request,
  previewRequest: RulePreviewRequest,
): Promise<RulePreviewState> => {
  const { evaluateEnvironment, match } = previewRequest;

  try {
    const data = await executeGraphqlWithAuth(request, RulePreviewDocument, {
      environment: evaluateEnvironment,
      input: {
        actionPayloadJson: '{}',
        actionType: match.actionType,
        environment: match.environment,
        repositoryId: match.repositoryId,
        status: match.status,
        tagAll: [...match.tagAll],
        title: 'preview',
      },
    });

    return { kind: 'ready', preview: data.previewTagActionRule };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'The preview failed.';

    return { kind: 'error', message };
  }
};

/**
 * @description {@link loadRulePreview} for a stored rule (the detail page): its own match fields,
 * evaluated in `evaluateEnvironment`. Null when there is no rule to preview.
 */
export const loadRulePreviewForRule = async (
  request: Request,
  rule: TagActionRuleRowFragment | null,
  evaluateEnvironment: string | null,
): Promise<RulePreviewState | null> => {
  if (rule == null) return null;

  return loadRulePreview(request, {
    evaluateEnvironment,
    match: {
      actionType: rule.actionType,
      environment: rule.environment ?? null,
      repositoryId: rule.repositoryId ?? null,
      status: rule.status ?? null,
      tagAll: rule.tagAll,
    },
  });
};
