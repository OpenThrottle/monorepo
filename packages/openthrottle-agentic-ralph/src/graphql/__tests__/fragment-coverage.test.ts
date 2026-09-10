/**
 * @description Tripwire for silent under-selection in the SHARED GraphQL
 * fragments.
 *
 * `ralph/fragments.graphql` is spread by every plan/task-shaped operation in
 * this package AND in `@openthrottle/openthrottle-mcp`, whose tool output is
 * the fragment's selection set passed through verbatim. So a scalar the
 * fragment does not select is a scalar no MCP caller can see — and nothing
 * about that looks like a failure: codegen succeeds, types are consistent, the
 * drift guard is happy, and the field simply is not there. That is exactly how
 * `PlanObject.runConfigJson` stayed invisible to `get_plan` long enough for a
 * bulk plan-to-repository pass to work around it with direct GraphQL (OT plan
 * 4b7576ac).
 *
 * The rule enforced here: every SCALAR or ENUM field of a covered schema type
 * is either selected by the fragment or listed in EXCLUSIONS below with a
 * reason. Adding a field server-side then fails this test until someone
 * decides, in writing, which it is.
 *
 * Object and list-of-object fields are deliberately NOT required — they need
 * their own selection set, and choosing not to traverse a relation is ordinary
 * query design rather than an oversight.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Kind,
  buildSchema,
  getNamedType,
  isEnumType,
  isObjectType,
  isScalarType,
  parse,
} from 'graphql';
import { describe, expect, it } from 'vitest';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** `packages/openthrottle-agentic-ralph/src/graphql/__tests__` → repo root. */
const WORKSPACE_ROOT = path.resolve(HERE, '../../../../..');

const FRAGMENTS_PATH = path.join(HERE, '../ralph/fragments.graphql');

const SCHEMA_PATH = path.join(
  WORKSPACE_ROOT,
  'applications/openthrottle-server/schema.gql',
);

/**
 * Scalar/enum fields a covered fragment intentionally does not select. Every
 * entry needs a reason: the point of the allowlist is that skipping a field
 * became a decision someone wrote down, not an omission nobody noticed.
 */
const EXCLUSIONS: Record<string, Record<string, string>> = {
  PlanObject: {
    hasCustomRunConfig:
      'Computed by the server from runConfigJson, which the fragment already selects — a consumer can derive it and does not need the round trip.',
    taskCount:
      'DataLoader-backed field resolver (plans-loaders.ts). Selecting it on every plan-shaped operation, list_plans_by_status included, buys a per-request count query no MCP tool consumes.',
    tasksCompletedCount:
      'Same DataLoader cost as taskCount, for a progress number no MCP tool consumes.',
  },
  TaskObject: {},
};

/** Schema types whose scalar surface the shared fragments must cover. */
const COVERED = [
  { fragment: 'Plan', type: 'PlanObject' },
  { fragment: 'Task', type: 'TaskObject' },
] as const;

const schema = buildSchema(readFileSync(SCHEMA_PATH, 'utf8'));
const documents = parse(readFileSync(FRAGMENTS_PATH, 'utf8'));

/** Top-level field names a fragment selects (spreads are not used here). */
const selectionsOf = (fragmentName: string): string[] => {
  const definition = documents.definitions.find(
    (node) =>
      node.kind === Kind.FRAGMENT_DEFINITION &&
      node.name.value === fragmentName,
  );

  if (
    definition === undefined ||
    definition.kind !== Kind.FRAGMENT_DEFINITION
  ) {
    throw new Error(
      `fragment ${fragmentName} is not defined in ${FRAGMENTS_PATH}`,
    );
  }

  return definition.selectionSet.selections.flatMap((selection) =>
    selection.kind === Kind.FIELD ? [selection.name.value] : [],
  );
};

/**
 * Scalar/enum field names on a schema object type. `getNamedType` unwraps
 * non-null and list wrappers, so `[String!]!` counts as a scalar field while
 * `[TaskObject!]!` does not.
 */
const scalarFieldsOf = (typeName: string): string[] => {
  const type = schema.getType(typeName);

  if (!isObjectType(type)) {
    throw new Error(`type ${typeName} is not an object type in ${SCHEMA_PATH}`);
  }

  return Object.values(type.getFields()).flatMap((field) => {
    const named = getNamedType(field.type);

    return isScalarType(named) || isEnumType(named) ? [field.name] : [];
  });
};

describe('shared fragment coverage', () => {
  it.each(COVERED)(
    'fragment $fragment selects or consciously excludes every scalar field of $type',
    ({ fragment, type }) => {
      const selected = new Set(selectionsOf(fragment));
      const excluded = EXCLUSIONS[type] ?? {};

      const uncovered = scalarFieldsOf(type).filter(
        (field) => !selected.has(field) && excluded[field] === undefined,
      );

      expect(
        uncovered,
        [
          `${type} has scalar field(s) that fragment ${fragment} neither selects nor excludes:`,
          ...uncovered.map((field) => `  • ${field}`),
          '',
          `Every plan/task-shaped GraphQL operation in this package and in openthrottle-mcp spreads ${fragment}, and MCP tool output IS that selection set — so an unselected field is invisible to every MCP caller.`,
          `Fix: add the field to fragment ${fragment} in src/graphql/ralph/fragments.graphql and regenerate (nx run openthrottle-agentic-ralph:codegen-graphql), OR add it to EXCLUSIONS in this file with a reason.`,
        ].join('\n'),
      ).toEqual([]);
    },
  );

  it('every exclusion names a field that still exists on its type', () => {
    const stale = Object.entries(EXCLUSIONS).flatMap(([type, fields]) => {
      const actual = new Set(scalarFieldsOf(type));

      return Object.keys(fields)
        .filter((field) => !actual.has(field))
        .map((field) => `${type}.${field}`);
    });

    expect(
      stale,
      `EXCLUSIONS names field(s) the schema no longer has — delete them so the allowlist cannot quietly outlive its reason:\n${stale.join('\n')}`,
    ).toEqual([]);
  });
});
