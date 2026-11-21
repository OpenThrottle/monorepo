import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';

import {
  RulesDeleteTagActionRuleDocument,
  RulesUpsertTagActionRuleDocument,
} from '~/__generated__/graphql';
import type { RulesActionFormData } from '~/routing/rules/utils/RulesActionFormSchema';

export type RulesActionResult =
  { readonly ruleError: string } | { readonly ruleSaved: true };

/**
 * @description Runs a parsed rules action (delete, or flip a rule's enabled
 * flag) for the signed-in user. Shared by the rules index and the rule detail
 * route so both submit the same popover/toggle forms. Failures come back as a
 * `ruleError` result instead of throwing.
 */
export const runRulesAction = async (
  request: Request,
  data: RulesActionFormData,
): Promise<RulesActionResult> => {
  try {
    if (data.intent === 'deleteRule') {
      await executeGraphqlWithAuth(request, RulesDeleteTagActionRuleDocument, {
        input: { id: data.id },
      });
      return { ruleSaved: true };
    }

    const value = data.rule;
    await executeGraphqlWithAuth(request, RulesUpsertTagActionRuleDocument, {
      input: {
        actionPayloadJson: value.actionPayloadJson,
        actionType: value.actionType,
        enabled: !value.enabled,
        environment: value.environment,
        id: value.id,
        repositoryId: value.repositoryId ?? null,
        status: value.status,
        tagAll: value.tagAll,
        title: value.title,
      },
    });
    return { ruleSaved: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ruleError: message };
  }
};
