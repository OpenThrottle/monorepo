import { z } from 'zod/v3';

/** The row fields the toggle action reads; unknown row keys are stripped. */
const RuleRowSchema = z.object({
  actionPayloadJson: z.string(),
  actionType: z.string(),
  enabled: z.boolean(),
  environment: z.string().nullish(),
  id: z.string().min(1),
  projectId: z.string().nullish(),
  repositoryId: z.string().nullish(),
  status: z.string().nullish(),
  tagAll: z.array(z.string()),
  title: z.string(),
});

/** Parse the JSON-encoded `rule` field; malformed JSON is a validation issue. */
const RuleJsonSchema = z
  .string()
  .transform((raw, ctx) => {
    try {
      const value: unknown = JSON.parse(raw);
      return value;
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Rule payload must be valid JSON.',
      });
      return z.NEVER;
    }
  })
  .pipe(RuleRowSchema);

/**
 * @description Form shape for the rules index action, discriminated on
 * `intent`. Callers parse with `allow: []` so `intent` reaches the schema.
 */
export const RulesActionFormSchema = z.discriminatedUnion('intent', [
  z.object({
    id: z.string().min(1),
    intent: z.literal('deleteRule'),
  }),
  z.object({
    intent: z.literal('toggleEnabled'),
    rule: RuleJsonSchema,
  }),
]);

export type RulesActionFormData = z.infer<typeof RulesActionFormSchema>;
