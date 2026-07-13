/**
 * @description Tag→action rule tool handlers + schemas: upsert_tag_action_rule,
 * delete_tag_action_rule, list_tag_action_rules, list_rule_applications.
 * GraphQL-only boundary — no core import, no Nest bootstrap. Rules are
 * user-owned: v1 rule mutations require the MCP to authenticate with a USER
 * token; a service-account token gets an explanatory server error. Action
 * payloads travel as JSON strings and are Zod-validated per action type
 * server-side.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { z } from 'zod';

import {
  DeleteTagActionRuleDocument,
  RuleApplicationsDocument,
  TagActionRulesDocument,
  UpsertTagActionRuleDocument,
} from '../__generated__/graphql.js';
import {
  DeleteTagActionRuleInputSchema,
  UpsertTagActionRuleInputSchema,
} from '../__generated__/schemas.ts';
import type { GenericResult } from '../types/index.ts';
import { getAuthToken } from '../auth/get-auth-token.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { runTool } from '../utils/tool-result.ts';

type TagActionRule = {
  actionPayloadJson: string;
  actionType: string;
  createdAt: string;
  enabled: boolean;
  environment: string | null;
  id: string;
  projectId: string | null;
  status: string | null;
  tagAll: string[];
  updatedAt: string;
  userId: string;
};

type RuleApplication = {
  createdAt: string;
  detailsJson: string | null;
  id: string;
  planId: string;
  ruleId: string;
  state: string;
  taskId: string | null;
  updatedAt: string;
};

// ── list_tag_action_rules ────────────────────────────────────────────────────

export const listTagActionRulesToolParameters = z.object({});

export const listTagActionRulesToolDescription = `List the authenticated user's tag→action rules via the tagActionRules GraphQL query. No arguments. Rules map tag combinations on plans to actions (inject-task, availability-exception).`;

export async function listTagActionRulesToolHandler(
  _args: z.infer<typeof listTagActionRulesToolParameters>,
): Promise<GenericResult<{ rules: TagActionRule[]; totalCount: number }>> {
  return runTool<{ rules: TagActionRule[]; totalCount: number }>(
    'list_tag_action_rules',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        TagActionRulesDocument,
        {},
      );
      const rows = result?.tagActionRules;
      if (!rows) {
        return null;
      }
      const rules: TagActionRule[] = rows.map((rule) => ({
        actionPayloadJson: rule.actionPayloadJson,
        actionType: rule.actionType,
        createdAt: rule.createdAt,
        enabled: rule.enabled,
        environment: rule.environment ?? null,
        id: rule.id,
        projectId: rule.projectId ?? null,
        status: rule.status ?? null,
        tagAll: rule.tagAll,
        updatedAt: rule.updatedAt,
        userId: rule.userId,
      }));

      const text =
        rules.length === 0
          ? 'No tag→action rules.'
          : `Tag→action rules (${rules.length}): ${rules
              .map(
                (rule) =>
                  `${rule.id} [${rule.actionType}] tagAll=[${rule.tagAll.join(', ')}]${rule.enabled ? '' : ' (disabled)'}`,
              )
              .join('; ')}`;

      return {
        structuredContent: { rules, totalCount: rules.length },
        text,
      };
    },
  );
}

// ── list_rule_applications ───────────────────────────────────────────────────

export const listRuleApplicationsToolParameters = z.object({
  planId: z.string().min(1),
});

export const listRuleApplicationsToolDescription = `List the apply-once ledger rows (rule_applications) for a plan via the ruleApplications GraphQL query. Requires planId. States: applied | pre-satisfied | flagged | orphaned — flagged/orphaned rows are the human-attention queue.`;

export async function listRuleApplicationsToolHandler(
  args: z.infer<typeof listRuleApplicationsToolParameters>,
): Promise<
  GenericResult<{ applications: RuleApplication[]; totalCount: number }>
> {
  const parsed = listRuleApplicationsToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ applications: RuleApplication[]; totalCount: number }>(
    'list_rule_applications',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        RuleApplicationsDocument,
        { planId: parsed.data.planId },
      );
      const rows = result?.ruleApplications;
      if (!rows) {
        return null;
      }
      const applications: RuleApplication[] = rows.map((application) => ({
        createdAt: application.createdAt,
        detailsJson: application.detailsJson ?? null,
        id: application.id,
        planId: application.planId,
        ruleId: application.ruleId,
        state: application.state,
        taskId: application.taskId ?? null,
        updatedAt: application.updatedAt,
      }));

      const text =
        applications.length === 0
          ? `No rule applications for plan ${parsed.data.planId}.`
          : `Rule applications (${applications.length}): ${applications
              .map(
                (application) => `${application.ruleId} → ${application.state}`,
              )
              .join('; ')}`;

      return {
        structuredContent: { applications, totalCount: applications.length },
        text,
      };
    },
  );
}

// ── upsert_tag_action_rule ───────────────────────────────────────────────────

export const upsertTagActionRuleToolParameters =
  UpsertTagActionRuleInputSchema();

export const upsertTagActionRuleToolDescription = `Create or update a tag→action rule via the upsertTagActionRule GraphQL mutation. actionPayloadJson is a JSON string validated per actionType server-side (inject-task: {skillSlug, placement?, titleTemplate?, descriptionTemplate?}; availability-exception: {tagAllow?, tagDeny?, slugAllow?, slugDeny?}). Requires a USER token (rules are user-owned in v1).`;

export async function upsertTagActionRuleToolHandler(
  args: z.infer<typeof upsertTagActionRuleToolParameters>,
): Promise<GenericResult<{ rule: TagActionRule }>> {
  const parsed = upsertTagActionRuleToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ rule: TagActionRule }>(
    'upsert_tag_action_rule',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        UpsertTagActionRuleDocument,
        { input: parsed.data },
      );
      const row = result?.upsertTagActionRule;
      if (!row) {
        return null;
      }

      const rule: TagActionRule = {
        actionPayloadJson: row.actionPayloadJson,
        actionType: row.actionType,
        createdAt: row.createdAt,
        enabled: row.enabled,
        environment: row.environment ?? null,
        id: row.id,
        projectId: row.projectId ?? null,
        status: row.status ?? null,
        tagAll: row.tagAll,
        updatedAt: row.updatedAt,
        userId: row.userId,
      };
      return {
        structuredContent: { rule },
        text: `Upserted rule ${rule.id} [${rule.actionType}] tagAll=[${rule.tagAll.join(', ')}]`,
      };
    },
  );
}

// ── delete_tag_action_rule ───────────────────────────────────────────────────

export const deleteTagActionRuleToolParameters =
  DeleteTagActionRuleInputSchema();

export const deleteTagActionRuleToolDescription = `Delete a tag→action rule via the deleteTagActionRule GraphQL mutation (its ledger rows CASCADE). Returns whether a rule was deleted. Requires a USER token.`;

export async function deleteTagActionRuleToolHandler(
  args: z.infer<typeof deleteTagActionRuleToolParameters>,
): Promise<GenericResult<{ deleted: boolean }>> {
  const parsed = deleteTagActionRuleToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error.message);
  }

  return runTool<{ deleted: boolean }>('delete_tag_action_rule', async () => {
    const token = getAuthToken();
    const result = await executeGraphqlWithAuth(
      token,
      DeleteTagActionRuleDocument,
      { input: parsed.data },
    );
    const deleted = result?.deleteTagActionRule ?? false;
    const text = deleted
      ? `Deleted rule ${parsed.data.id}`
      : `Rule not found: ${parsed.data.id}`;
    return { structuredContent: { deleted }, text };
  });
}
