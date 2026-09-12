import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { developerMcpToolDefinitions } from './tool-registry.ts';
import {
  listPlansByStatusToolHandler,
  listPlansByStatusToolParameters,
} from './tools/plans.ts';

/**
 * @description Regression suite for the silent-strip defect: a zod object strips
 * unknown keys by default, so `list_plans_by_status({ status: 'BLOCKED' })` — the
 * singular of the real `statuses` filter — validated clean, ran as "no filter" and
 * returned every plan while reporting success. The caller cannot tell that from a
 * correct unfiltered call.
 *
 * The tests that matter here are the MISNAMED-key calls, not the correct ones. This
 * is a registry-wide invariant rather than a per-tool assertion so a tool added later
 * cannot quietly reintroduce the hole.
 */

/** The sentinel key. Chosen to collide with no real parameter on any tool. */
const UNKNOWN_KEY = '__definitely_not_a_real_parameter__';

/**
 * Structural view of a zod issue that reads the same on the `zod/v3` compat schemas
 * (generated `*InputSchema()`) and the native zod v4 schemas the ad-hoc tool
 * parameters use — mirroring `ZodIssueLike` in `src/utils/errors.ts`.
 */
interface ZodIssueLike {
  readonly code: string;
  readonly keys?: ReadonlyArray<string>;
  readonly message: string;
}

interface ParseFailureLike {
  readonly error: { readonly issues: ReadonlyArray<ZodIssueLike> };
  readonly success: false;
}

interface ParseSuccessLike {
  readonly success: true;
}

interface SchemaLike {
  readonly safeParse: (value: unknown) => ParseFailureLike | ParseSuccessLike;
}

/**
 * Deliberately does NOT require `.shape`: `get_activity_by_date` is a strict object
 * wrapped in `.refine()`, so its registered schema is a ZodEffects. What matters is
 * that the registered schema rejects the key, not which wrapper it arrives in.
 */
const isSchemaLike = (value: unknown): value is SchemaLike => {
  if (typeof value !== 'object' || value === null) return false;
  // `in` (not a spread) — `safeParse` lives on the zod prototype, not the instance.
  if (!('safeParse' in value)) return false;
  return typeof value.safeParse === 'function';
};

describe('developer MCP tool parameter schemas reject unknown keys', () => {
  it.each(
    developerMcpToolDefinitions.map((tool) => [tool.name, tool] as const),
  )(
    '%s names an unrecognized key instead of silently stripping it',
    (name, tool) => {
      expect(
        isSchemaLike(tool.parameters),
        `Tool "${name}" parameters are not a zod schema`,
      ).toBe(true);
      if (!isSchemaLike(tool.parameters)) return;

      const result = tool.parameters.safeParse({ [UNKNOWN_KEY]: 'x' });

      expect(
        result.success,
        `Tool "${name}" accepted the unknown key "${UNKNOWN_KEY}"`,
      ).toBe(false);
      if (result.success) return;

      const unrecognized = result.error.issues.filter(
        (issue) => issue.code === 'unrecognized_keys',
      );

      expect(
        unrecognized.length,
        `Tool "${name}" stripped "${UNKNOWN_KEY}" silently instead of raising unrecognized_keys. Issues: ${JSON.stringify(result.error.issues)}`,
      ).toBeGreaterThan(0);

      // The failure must NAME the offending key — a validation error the agent
      // cannot read is barely better than the silent strip.
      const named = unrecognized.some(
        (issue) =>
          issue.message.includes(UNKNOWN_KEY) ||
          (issue.keys ?? []).includes(UNKNOWN_KEY),
      );
      expect(
        named,
        `Tool "${name}" rejected the unknown key without naming it: ${JSON.stringify(unrecognized)}`,
      ).toBe(true);
    },
  );
});

/**
 * @description The reported instance, end to end through the handler's own error
 * surface. `list_plans_by_status` takes `statuses` (an array); called with the
 * singular `status` it used to validate clean, run as "no filter", and return every
 * plan alongside `totalCount: 949` while reporting success.
 *
 * This asserts the shape of the failure, not just its presence: `runTool` sanitizes
 * thrown backend errors by category, so a rejection that reached it would come back
 * as "internal error" with the offending key gone. The `safeParse` guard runs BEFORE
 * `runTool`, so the key survives into the message the agent reads.
 */
describe('list_plans_by_status rejects the singular `status` filter', () => {
  it('names the offending key instead of silently listing every plan', async () => {
    const result = await listPlansByStatusToolHandler(
      // The whole point of the regression: this object is what a caller actually
      // sent. It does not type-check against the strict schema, which is the fix
      // working — `satisfies` is deliberately absent so the runtime guard is what
      // gets exercised.
      JSON.parse('{"status":"BLOCKED"}'),
    );

    expect(result).toMatchObject({ isError: true });
    const text = result.content[0]?.text ?? '';
    expect(text).toContain('Invalid arguments');
    expect(text).toContain('status');
    // Must not be replaced by the generic sanitized string.
    expect(text).not.toContain('internal error');
  });

  it('still accepts the correct `statuses` filter', () => {
    const parsed = listPlansByStatusToolParameters.safeParse({
      statuses: ['BLOCKED'],
    });
    expect(parsed.success).toBe(true);
  });
});
