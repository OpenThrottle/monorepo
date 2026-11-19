import type { z } from 'zod';

import type { skillAvailabilityRuleInputSchema } from './skill-availability.constants.ts';
/** Parsed, normalized rule input (arrays defaulted, environment defaulted to null). */
export type SkillAvailabilityRuleInput = z.infer<
  typeof skillAvailabilityRuleInputSchema
>;

/**
 * Loose caller-facing rule input. Deliberately wider than the schema's `z.input`
 * (which narrows `environment` to the enum): the GraphQL/MCP layers deliver
 * `environment` as an arbitrary `string`, so callers pass the raw value and the
 * strict schema does the narrowing + rejection at runtime.
 */
export interface SkillAvailabilityRuleInputArgs {
  readonly environment?: string | null;
  readonly slugAllow?: readonly string[];
  readonly slugDeny?: readonly string[];
  readonly tagAllow?: readonly string[];
  readonly tagDeny?: readonly string[];
}
