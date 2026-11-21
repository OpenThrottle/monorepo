/**
 * @description Tag→action rule tool handlers + schemas: upsert_tag_action_rule,
 * delete_tag_action_rule, list_tag_action_rules, list_rule_applications,
 * preview_tag_action_rule.
 * GraphQL-only boundary — no core import, no Nest bootstrap. Rules are
 * user-owned: v1 rule mutations require the MCP to authenticate with a USER
 * token; a service-account token gets an explanatory server error. Action
 * payloads travel as JSON strings and are Zod-validated per action type
 * server-side.
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
import { z } from 'zod';

import type {
  RuleApplicationFragment,
  TagActionRulePreviewFragment,
} from '../__generated__/graphql.js';
import {
  DeleteTagActionRuleDocument,
  PreviewTagActionRuleDocument,
  RuleApplicationsDocument,
  RuleApplicationsForRuleDocument,
  TagActionRulesDocument,
  UpsertTagActionRuleDocument,
} from '../__generated__/graphql.js';
import {
  DeleteTagActionRuleInputSchema,
  UpsertTagActionRuleInputSchema,
} from '../__generated__/schemas.ts';
import { getAuthToken } from '../auth/getAuthToken.ts';
import type { GenericResult } from '../types/index.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { runTool } from '../utils/runTool.ts';

type TagActionRule = {
  actionPayloadJson: string;
  actionType: string;
  createdAt: string;
  enabled: boolean;
  environment: string | null;
  id: string;
  projectId: string | null;
  repositoryId: string | null;
  status: string | null;
  tagAll: string[];
  title: string;
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

export const listTagActionRulesToolParameters = z.object({}).strict();

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
        repositoryId: rule.repositoryId ?? null,
        status: rule.status ?? null,
        tagAll: rule.tagAll,
        title: rule.title,
        updatedAt: rule.updatedAt,
        userId: rule.userId,
      }));

      const ruleList = rules
        .map(
          (rule) =>
            `${rule.id} "${rule.title}" [${rule.actionType}] tagAll=[${rule.tagAll.join(', ')}]${rule.enabled ? '' : ' (disabled)'}`,
        )
        .join('; ');
      const listText = `Tag→action rules (${rules.length}): ${ruleList}`;
      const text = rules.length === 0 ? 'No tag→action rules.' : listText;

      return {
        structuredContent: { rules, totalCount: rules.length },
        text,
      };
    },
  );
}

// ── list_rule_applications ───────────────────────────────────────────────────

const fetchLedgerRows = async (
  token: string,
  scope: {
    readonly planId: string | undefined;
    readonly ruleId: string | undefined;
  },
): Promise<RuleApplicationFragment[] | undefined> => {
  if (scope.ruleId !== undefined) {
    const result = await executeGraphqlWithAuth(
      token,
      RuleApplicationsForRuleDocument,
      { ruleId: scope.ruleId },
    );
    return result?.ruleApplicationsForRule;
  }
  const result = await executeGraphqlWithAuth(token, RuleApplicationsDocument, {
    planId: scope.planId ?? '',
  });
  return result?.ruleApplications;
};

/**
 * @description The registered (advertised) schema: a plain strict object so `tools/list` publishes `planId` and
 * `ruleId`. The exactly-one rule lives in {@link listRuleApplicationsArgs}: a zod v3 `.refine()` is a ZodEffects,
 * which the MCP SDK serializes as `properties: {}`.
 */
export const listRuleApplicationsToolParameters = z
  .object({
    planId: z
      .string()
      .min(1)
      .optional()
      .describe('List the ledger of this plan.'),
    ruleId: z
      .string()
      .min(1)
      .optional()
      .describe(
        'List the ledger of this rule across plans (your own rules only).',
      ),
  })
  .strict();

const listRuleApplicationsArgs = listRuleApplicationsToolParameters.refine(
  (data) => (data.planId === undefined) !== (data.ruleId === undefined),
  { message: 'Provide exactly one of planId or ruleId' },
);

export const listRuleApplicationsToolDescription = `List the apply-once ledger rows (rule_applications) for a plan (ruleApplications query) or for one of your own rules across plans (ruleApplicationsForRule query). Provide exactly one of planId or ruleId. States: applied | pre-satisfied | flagged | orphaned — flagged/orphaned rows are the human-attention queue.`;

export async function listRuleApplicationsToolHandler(
  args: z.infer<typeof listRuleApplicationsToolParameters>,
): Promise<
  GenericResult<{ applications: RuleApplication[]; totalCount: number }>
> {
  const parsed = listRuleApplicationsArgs.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ applications: RuleApplication[]; totalCount: number }>(
    'list_rule_applications',
    async () => {
      const token = getAuthToken();
      const { planId, ruleId } = parsed.data;
      const rows = await fetchLedgerRows(token, { planId, ruleId });
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

      const applicationList = applications
        .map((application) => `${application.ruleId} → ${application.state}`)
        .join('; ');
      const subject =
        ruleId === undefined ? `plan ${planId}` : `rule ${ruleId}`;
      const emptyText = `No rule applications for ${subject}.`;
      const listText = `Rule applications (${applications.length}): ${applicationList}`;
      const text = applications.length === 0 ? emptyText : listText;

      return {
        structuredContent: { applications, totalCount: applications.length },
        text,
      };
    },
  );
}

// ── upsert_tag_action_rule ───────────────────────────────────────────────────

export const upsertTagActionRuleToolParameters =
  UpsertTagActionRuleInputSchema().strict();

export const upsertTagActionRuleToolDescription = `Create or update a tag→action rule via the upsertTagActionRule GraphQL mutation. actionPayloadJson is a JSON string validated per actionType server-side (inject-task: {skillSlug, placement?, anchor?, titleTemplate?, descriptionTemplate?}; placement is 'first'|'last'|'before'|'after' (default 'first') — 'before'/'after' require an anchor {taskId|skillSlug|titleMatch} naming the task to land beside; availability-exception: {tagAllow?, tagDeny?, slugAllow?, slugDeny?}). Requires a USER token (rules are user-owned in v1).`;

export async function upsertTagActionRuleToolHandler(
  args: z.infer<typeof upsertTagActionRuleToolParameters>,
): Promise<GenericResult<{ rule: TagActionRule }>> {
  const parsed = upsertTagActionRuleToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
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
        repositoryId: row.repositoryId ?? null,
        status: row.status ?? null,
        tagAll: row.tagAll,
        title: row.title,
        updatedAt: row.updatedAt,
        userId: row.userId,
      };
      return {
        structuredContent: { rule },
        text: `Upserted rule ${rule.id} "${rule.title}" [${rule.actionType}] tagAll=[${rule.tagAll.join(', ')}]`,
      };
    },
  );
}

// ── delete_tag_action_rule ───────────────────────────────────────────────────

export const deleteTagActionRuleToolParameters =
  DeleteTagActionRuleInputSchema().strict();

export const deleteTagActionRuleToolDescription = `Soft delete a tag→action rule via the deleteTagActionRule GraphQL mutation (ledger rows kept). Returns whether a rule was deleted. Requires a USER token.`;

export async function deleteTagActionRuleToolHandler(
  args: z.infer<typeof deleteTagActionRuleToolParameters>,
): Promise<GenericResult<{ deleted: boolean }>> {
  const parsed = deleteTagActionRuleToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
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

// ── preview_tag_action_rule ──────────────────────────────────────────────────

export const previewTagActionRuleToolParameters = z
  .object({
    actionType: z
      .string()
      .min(1)
      .describe(
        'The rule action type: inject-task | availability-exception | promote-task-to-plan | attach-prompt.',
      ),
    environment: z
      .string()
      .nullish()
      .describe(
        `The rule's own environment qualifier (ci | interactive | ralph); omit for a rule that applies everywhere.`,
      ),
    evaluateEnvironment: z
      .string()
      .nullish()
      .describe(
        'The environment to evaluate your plans in (ci | interactive | ralph). Omit for none: an environment-qualified rule then matches nothing.',
      ),
    repositoryId: z
      .string()
      .nullish()
      .describe('The rule repository scope; omit to match every repository.'),
    status: z
      .string()
      .nullish()
      .describe('The rule plan-status qualifier (e.g. PENDING).'),
    tagAll: z
      .array(z.string())
      .optional()
      .describe('Tags that must ALL be on the plan; empty matches every plan.'),
  })
  .strict();

export const previewTagActionRuleToolDescription = `Dry run a tag→action rule via the previewTagActionRule GraphQL query: which of your plans it would match and, for a sample of the rest, which conditions (repository, environment, status, tags) failed and which tags are missing. Answers "why didn't my rule fire". Read-only: dispatches nothing and writes no ledger row. Only the match fields are needed (no payload). Evaluates your newest 500 plans and says when it truncated. A rule qualified on an environment matches nothing unless you pass evaluateEnvironment (failedOnlyOnEnvironment marks that case). Requires a USER token.`;

const describePreview = (preview: TagActionRulePreviewFragment): string => {
  const lines = [
    `Matches ${preview.matchedCount} of ${preview.evaluated} plans${preview.truncated ? ` (truncated: only the newest ${preview.cap} were evaluated)` : ''}${preview.environment == null ? '' : ` in environment ${preview.environment}`}.`,
  ];
  for (const plan of preview.nonMatching) {
    const failed = plan.conditions
      .filter((condition) => !condition.passed)
      .map((condition) => condition.condition)
      .join(', ');
    const hint = plan.failedOnlyOnEnvironment ? ' (environment only)' : '';
    lines.push(
      `Not matched: ${plan.id} "${plan.title}" failed ${failed}${hint}`,
    );
  }
  return lines.join('\n');
};

export async function previewTagActionRuleToolHandler(
  args: z.infer<typeof previewTagActionRuleToolParameters>,
): Promise<GenericResult<{ preview: TagActionRulePreviewFragment }>> {
  const parsed = previewTagActionRuleToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ preview: TagActionRulePreviewFragment }>(
    'preview_tag_action_rule',
    async () => {
      const token = getAuthToken();
      const { actionType, environment, evaluateEnvironment, repositoryId } =
        parsed.data;
      const result = await executeGraphqlWithAuth(
        token,
        PreviewTagActionRuleDocument,
        {
          environment: evaluateEnvironment ?? null,
          // The server reads only the match fields; title and payload are placeholders.
          input: {
            actionPayloadJson: '{}',
            actionType,
            environment: environment ?? null,
            repositoryId: repositoryId ?? null,
            status: parsed.data.status ?? null,
            tagAll: parsed.data.tagAll ?? [],
            title: 'preview',
          },
        },
      );
      const preview = result?.previewTagActionRule;
      if (!preview) {
        return null;
      }
      return { structuredContent: { preview }, text: describePreview(preview) };
    },
  );
}
