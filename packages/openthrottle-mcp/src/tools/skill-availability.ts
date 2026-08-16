/**
 * @description Per-project skill-availability tool handlers + schemas:
 * get_skill_availability_rule_set, upsert_skill_availability_rule_set,
 * delete_skill_availability_rule_set, add_skill_availability_rule,
 * update_skill_availability_rule, remove_skill_availability_rule. Mirrors the
 * skillAvailabilityRuleSet query and the posture/rule mutations via GraphQL only —
 * GraphQL-only boundary, no core import, no Nest bootstrap in this process.
 * See docs/monorepo/skill-availability-design.md ("Rules").
 */

import { executeGraphqlWithAuth } from '@openthrottle/nodejs-graphql';
// zod/v3 to match the generated *InputSchema (src/__generated__/schemas.ts imports
// from zod/v3): nesting the generated SkillAvailabilityRuleInputSchema() inside a v4
// z.object erases its inferred type to `unknown`, so the whole file uses v3 here.
import { z } from 'zod/v3';

import {
  AddSkillAvailabilityRuleDocument,
  DeleteSkillAvailabilityRuleSetDocument,
  RemoveSkillAvailabilityRuleDocument,
  SkillAvailabilityDocument,
  SkillAvailabilityRuleSetDocument,
  UpdateSkillAvailabilityRuleDocument,
  UpsertSkillAvailabilityRuleSetDocument,
} from '../__generated__/graphql.js';
import { SkillAvailabilityRuleInputSchema } from '../__generated__/schemas.ts';
import type { GenericResult } from '../types/index.ts';
import { getAuthToken } from '../auth/get-auth-token.ts';
import { invalidArgsContent } from '../utils/errors.ts';
import { runTool } from '../utils/tool-result.ts';

type SkillAvailabilityRule = {
  environment: string | null;
  id: string;
  slugAllow: string[];
  slugDeny: string[];
  tagAllow: string[];
  tagDeny: string[];
};

type SkillAvailabilityRuleSet = {
  posture: string;
  rules: SkillAvailabilityRule[];
};

type RuleFragment = {
  environment?: string | null;
  id: string;
  slugAllow: string[];
  slugDeny: string[];
  tagAllow: string[];
  tagDeny: string[];
};

const toRule = (rule: RuleFragment): SkillAvailabilityRule => ({
  environment: rule.environment ?? null,
  id: rule.id,
  slugAllow: rule.slugAllow,
  slugDeny: rule.slugDeny,
  tagAllow: rule.tagAllow,
  tagDeny: rule.tagDeny,
});

const describeRuleSet = (ruleSet: SkillAvailabilityRuleSet): string =>
  `posture=${ruleSet.posture}, ${ruleSet.rules.length} rule(s)`;

// ── get_skill_availability_rule_set ──────────────────────────────────────────

export const getSkillAvailabilityRuleSetToolParameters = z.object({
  projectId: z.string(),
});

export const getSkillAvailabilityRuleSetToolDescription = `Get a project's skill-availability rule set (posture + rules) via the skillAvailabilityRuleSet GraphQL query. Returns null when the project has no rules (passthrough).`;

export async function getSkillAvailabilityRuleSetToolHandler(
  args: z.infer<typeof getSkillAvailabilityRuleSetToolParameters>,
): Promise<GenericResult<{ ruleSet: SkillAvailabilityRuleSet | null }>> {
  const parsed = getSkillAvailabilityRuleSetToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ ruleSet: SkillAvailabilityRuleSet | null }>(
    'get_skill_availability_rule_set',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        SkillAvailabilityRuleSetDocument,
        { projectId: parsed.data.projectId },
      );
      const found = result?.skillAvailabilityRuleSet;
      if (!found) {
        return {
          structuredContent: { ruleSet: null },
          text: 'No skill-availability rule set (passthrough).',
        };
      }

      const ruleSet: SkillAvailabilityRuleSet = {
        posture: found.posture,
        rules: found.rules.map(toRule),
      };
      return {
        structuredContent: { ruleSet },
        text: `Skill-availability rule set: ${describeRuleSet(ruleSet)}`,
      };
    },
  );
}

// ── get_skill_availability ───────────────────────────────────────────────────

type ResolvedSkillAvailability = {
  effectiveDisableModelInvocation: boolean;
  matchedPlanTags: string[];
  planRelevant: boolean;
  provenance: string;
  slug: string;
  staticDisableModelInvocation: boolean | null;
};

type SkillAvailabilityResolution = {
  skills: ResolvedSkillAvailability[];
  totalCount: number;
  warnings: string[];
};

export const getSkillAvailabilityToolParameters = z.object({
  environment: z.enum(['ci', 'interactive', 'ralph']).optional(),
  planId: z.string().optional(),
  projectId: z.string().optional(),
  relevantOnly: z.boolean().optional(),
  taskId: z.string().optional(),
});

export const getSkillAvailabilityToolDescription = `Resolve every skill's effective disable-model-invocation for a project and environment via the skillAvailability GraphQL query. Omit projectId to resolve the dogfood monorepo project; environment defaults to "interactive" (ci | interactive | ralph). Optional plan context: planId (and taskId within it) annotates each skill with matchedPlanTags (skill tags ∩ the plan's effective domain tag set) and planRelevant, applies matched availability-exception rules ephemerally, and relevantOnly=true filters to plan-relevant skills. Returns each skill's static (tri-state) and effective flags plus the decisive rung's provenance, and deduped resolve-time warnings. Concerns model auto-invocation only — human /skill invocation is never gated.`;

export async function getSkillAvailabilityToolHandler(
  args: z.infer<typeof getSkillAvailabilityToolParameters>,
): Promise<GenericResult<SkillAvailabilityResolution>> {
  const parsed = getSkillAvailabilityToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<SkillAvailabilityResolution>(
    'get_skill_availability',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        SkillAvailabilityDocument,
        {
          environment: parsed.data.environment ?? null,
          planId: parsed.data.planId ?? null,
          projectId: parsed.data.projectId ?? null,
          relevantOnly: parsed.data.relevantOnly ?? null,
          taskId: parsed.data.taskId ?? null,
        },
      );
      const found = result?.skillAvailability;
      if (!found) {
        return null;
      }

      const resolution: SkillAvailabilityResolution = {
        skills: found.skills.map((skill) => ({
          effectiveDisableModelInvocation:
            skill.effectiveDisableModelInvocation,
          matchedPlanTags: skill.matchedPlanTags,
          planRelevant: skill.planRelevant,
          provenance: skill.provenance,
          slug: skill.slug,
          staticDisableModelInvocation:
            skill.staticDisableModelInvocation ?? null,
        })),
        totalCount: found.totalCount,
        warnings: found.warnings,
      };
      return {
        structuredContent: resolution,
        text: `Resolved ${resolution.totalCount} skill(s); ${resolution.warnings.length} warning(s).`,
      };
    },
  );
}

// ── upsert_skill_availability_rule_set ───────────────────────────────────────

export const upsertSkillAvailabilityRuleSetToolParameters = z.object({
  posture: z.enum(['allow', 'deny']),
  projectId: z.string(),
});

export const upsertSkillAvailabilityRuleSetToolDescription = `Create or update a project's skill-availability rule set posture ("allow" | "deny") via the upsertSkillAvailabilityRuleSet GraphQL mutation. Idempotent per project.`;

export async function upsertSkillAvailabilityRuleSetToolHandler(
  args: z.infer<typeof upsertSkillAvailabilityRuleSetToolParameters>,
): Promise<GenericResult<{ ruleSet: SkillAvailabilityRuleSet }>> {
  const parsed = upsertSkillAvailabilityRuleSetToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ ruleSet: SkillAvailabilityRuleSet }>(
    'upsert_skill_availability_rule_set',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        UpsertSkillAvailabilityRuleSetDocument,
        { posture: parsed.data.posture, projectId: parsed.data.projectId },
      );
      const updated = result?.upsertSkillAvailabilityRuleSet;
      if (!updated) {
        return null;
      }

      const ruleSet: SkillAvailabilityRuleSet = {
        posture: updated.posture,
        rules: updated.rules.map(toRule),
      };
      return {
        structuredContent: { ruleSet },
        text: `Upserted rule set: ${describeRuleSet(ruleSet)}`,
      };
    },
  );
}

// ── delete_skill_availability_rule_set ───────────────────────────────────────

export const deleteSkillAvailabilityRuleSetToolParameters = z.object({
  projectId: z.string(),
});

export const deleteSkillAvailabilityRuleSetToolDescription = `Delete a project's skill-availability rule set (cascading its rules) via the deleteSkillAvailabilityRuleSet GraphQL mutation. Returns whether a rule set was deleted.`;

export async function deleteSkillAvailabilityRuleSetToolHandler(
  args: z.infer<typeof deleteSkillAvailabilityRuleSetToolParameters>,
): Promise<GenericResult<{ deleted: boolean }>> {
  const parsed = deleteSkillAvailabilityRuleSetToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ deleted: boolean }>(
    'delete_skill_availability_rule_set',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        DeleteSkillAvailabilityRuleSetDocument,
        { projectId: parsed.data.projectId },
      );
      const deleted = result?.deleteSkillAvailabilityRuleSet ?? false;
      const text = deleted
        ? 'Deleted skill-availability rule set.'
        : 'No skill-availability rule set to delete.';
      return { structuredContent: { deleted }, text };
    },
  );
}

// ── add_skill_availability_rule ──────────────────────────────────────────────

export const addSkillAvailabilityRuleToolParameters = z.object({
  input: SkillAvailabilityRuleInputSchema(),
  projectId: z.string(),
});

export const addSkillAvailabilityRuleToolDescription = `Add a rule to a project's skill-availability rule set via the addSkillAvailabilityRule GraphQL mutation (creating the rule set with the default "allow" posture if absent). Tag references are validated against the caller's skill-tag vocabulary.`;

export async function addSkillAvailabilityRuleToolHandler(
  args: z.infer<typeof addSkillAvailabilityRuleToolParameters>,
): Promise<GenericResult<{ rule: SkillAvailabilityRule }>> {
  const parsed = addSkillAvailabilityRuleToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ rule: SkillAvailabilityRule }>(
    'add_skill_availability_rule',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        AddSkillAvailabilityRuleDocument,
        { input: parsed.data.input, projectId: parsed.data.projectId },
      );
      const added = result?.addSkillAvailabilityRule;
      if (!added) {
        return null;
      }

      const rule = toRule(added);
      return { structuredContent: { rule }, text: `Added rule: ${rule.id}` };
    },
  );
}

// ── update_skill_availability_rule ───────────────────────────────────────────

export const updateSkillAvailabilityRuleToolParameters = z.object({
  input: SkillAvailabilityRuleInputSchema(),
  ruleId: z.string(),
});

export const updateSkillAvailabilityRuleToolDescription = `Replace a rule's tag/slug lists and environment by rule id via the updateSkillAvailabilityRule GraphQL mutation. Tag references are validated against the caller's skill-tag vocabulary.`;

export async function updateSkillAvailabilityRuleToolHandler(
  args: z.infer<typeof updateSkillAvailabilityRuleToolParameters>,
): Promise<GenericResult<{ rule: SkillAvailabilityRule }>> {
  const parsed = updateSkillAvailabilityRuleToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ rule: SkillAvailabilityRule }>(
    'update_skill_availability_rule',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        UpdateSkillAvailabilityRuleDocument,
        { input: parsed.data.input, ruleId: parsed.data.ruleId },
      );
      const updated = result?.updateSkillAvailabilityRule;
      if (!updated) {
        return null;
      }

      const rule = toRule(updated);
      return { structuredContent: { rule }, text: `Updated rule: ${rule.id}` };
    },
  );
}

// ── remove_skill_availability_rule ───────────────────────────────────────────

export const removeSkillAvailabilityRuleToolParameters = z.object({
  ruleId: z.string(),
});

export const removeSkillAvailabilityRuleToolDescription = `Remove a rule by id via the removeSkillAvailabilityRule GraphQL mutation. Returns whether a rule was removed.`;

export async function removeSkillAvailabilityRuleToolHandler(
  args: z.infer<typeof removeSkillAvailabilityRuleToolParameters>,
): Promise<GenericResult<{ removed: boolean }>> {
  const parsed = removeSkillAvailabilityRuleToolParameters.safeParse(args);
  if (!parsed.success) {
    return invalidArgsContent(parsed.error);
  }

  return runTool<{ removed: boolean }>(
    'remove_skill_availability_rule',
    async () => {
      const token = getAuthToken();
      const result = await executeGraphqlWithAuth(
        token,
        RemoveSkillAvailabilityRuleDocument,
        { ruleId: parsed.data.ruleId },
      );
      const removed = result?.removeSkillAvailabilityRule ?? false;
      const text = removed
        ? `Removed rule: ${parsed.data.ruleId}`
        : 'Rule not found.';
      return { structuredContent: { removed }, text };
    },
  );
}
