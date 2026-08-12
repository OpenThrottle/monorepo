import type { SkillAvailabilityRuleInput } from '~/__generated__/graphql';
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

/** Build the rule mutation input from the submitted form fields. */
export const readRuleInput = (
  formData: FormData,
): SkillAvailabilityRuleInput => {
  const environment = formData.get('environment');
  return {
    environment:
      typeof environment === 'string' && environment !== ''
        ? environment
        : null,
    slugAllow: parseListField(formData.get('slugAllow')),
    slugDeny: parseListField(formData.get('slugDeny')),
    tagAllow: parseListField(formData.get('tagAllow')),
    tagDeny: parseListField(formData.get('tagDeny')),
  };
};
