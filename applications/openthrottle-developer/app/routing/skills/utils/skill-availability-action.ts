import { parseFormData } from '@openthrottle/react-router-graphql';
import { z } from 'zod/v3';
import type { SkillAvailabilityRuleInput } from '~/__generated__/graphql';
import { SkillAvailabilityRuleInputSchema } from '~/__generated__/schemas';
import {
  isSkillAvailabilityEnvironment,
  parseListField,
  type SkillAvailabilityEnvironment,
} from '~/routing/skills/utils/skill-availability';

/** Narrow a server `environment` string to a known env, degrading unknown values to null (all). */
export const toEnvironmentValue = (
  environment: string | null,
): SkillAvailabilityEnvironment | null => {
  if (environment != null && isSkillAvailabilityEnvironment(environment)) {
    return environment;
  }
  return null;
};

/**
 * The rule form serializes each list field to a single JSON string (see
 * {@link parseListField}), so the generated `z.array(...)` fields are fed
 * through a JSON preprocess. A missing field degrades to `[]`, matching the
 * pre-parseFormData defensive default.
 */
const serializedList = z.preprocess(
  (value) => (typeof value === 'string' ? parseListField(value) : []),
  z.array(z.string().min(1)),
);

/**
 * Build the rule mutation input from the submitted form fields, validating
 * through the generated `SkillAvailabilityRuleInputSchema`. `strict: false`
 * lets the form's dispatch fields (`intent`, `ruleId`, …) pass through — the
 * rule set's `projectId`/`ruleId` are handled separately at the call site.
 */
export const readRuleInput = (
  formData: FormData,
): SkillAvailabilityRuleInput => {
  const parsed = parseFormData(
    formData,
    SkillAvailabilityRuleInputSchema().extend({
      slugAllow: serializedList,
      slugDeny: serializedList,
      tagAllow: serializedList,
      tagDeny: serializedList,
    }),
    { strict: false },
  );

  if (!parsed.success) {
    return {
      environment: null,
      slugAllow: [],
      slugDeny: [],
      tagAllow: [],
      tagDeny: [],
    };
  }

  return {
    environment: parsed.data.environment ?? null,
    slugAllow: parsed.data.slugAllow,
    slugDeny: parsed.data.slugDeny,
    tagAllow: parsed.data.tagAllow,
    tagDeny: parsed.data.tagDeny,
  };
};
