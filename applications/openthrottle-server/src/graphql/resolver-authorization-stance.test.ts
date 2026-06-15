import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

/**
 * @description Drift gate for the resolver authorization model (ADR:
 * OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a). Every GraphQL resolver must DECLARE an
 * authorization stance so an unguarded resolver is a reviewed decision, not an oversight. A resolver
 * declares its stance by containing one of:
 *   - `@UseGuards(...)`     — permission/role enforced (pair with `@Permissions(...)`)
 *   - `@Public(...)`        — intentionally unauthenticated (bypasses the global GlobalAuthGuard)
 *   - `@authz-stance:` marker — authenticated-only by design (Path A); see the ADR
 * Adding a new resolver with none of these fails this test until the author makes a deliberate call.
 */

const graphqlDir = dirname(fileURLToPath(import.meta.url));

const STANCE_MARKERS = ['@UseGuards(', '@Public(', '@authz-stance:'] as const;

function findResolverFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...findResolverFiles(full));
    } else if (entry.name.endsWith('.resolver.ts')) {
      out.push(full);
    }
  }
  return out;
}

describe('resolver authorization stance (drift gate)', () => {
  const files = findResolverFiles(graphqlDir);

  test('discovers the resolver files', () => {
    // Guard against a broken glob silently passing the gate.
    expect(files.length).toBeGreaterThanOrEqual(25);
  });

  test('every *.resolver.ts declares an authorization stance', () => {
    const offenders = files
      .filter((file) => {
        const src = readFileSync(file, 'utf8');
        return !STANCE_MARKERS.some((marker) => src.includes(marker));
      })
      .map((file) => relative(graphqlDir, file));

    expect(
      offenders,
      `These resolvers declare no authorization stance. Add ONE of:\n` +
        `  • @UseGuards(GqlPermissionsGuard) + @Permissions(...)  — to permission-gate it\n` +
        `  • @Public()                                            — if intentionally unauthenticated\n` +
        `  • // @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)\n` +
        `Offenders:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });
});

/**
 * @description Auth-relevant method decorators. The batch-create mutations must carry the *same* set of
 * these as their single-create counterparts — a batch mutation that silently drops a guard or adds a
 * @Public() opt-out would bypass the authorization its single-create sibling enforces.
 */
const AUTH_METHOD_DECORATORS = [
  '@Permissions',
  '@Public',
  '@UseGuards',
] as const;

/** Returns the contiguous decorator/comment lines directly above an `async <method>(` declaration. */
function methodDecoratorBlock(src: string, methodName: string): string {
  const lines = src.split('\n');
  const methodLineIdx = lines.findIndex((line) =>
    line.includes(`async ${methodName}(`),
  );
  if (methodLineIdx === -1) {
    throw new Error(`Mutation "${methodName}" not found`);
  }

  const block: string[] = [];
  for (let index = methodLineIdx - 1; index >= 0; index -= 1) {
    if (lines[index].trim() === '') break;
    block.unshift(lines[index]);
  }

  return block.join('\n');
}

/** The auth-relevant decorators present in a method's decorator block. */
function authDecoratorsFor(src: string, methodName: string): string[] {
  const block = methodDecoratorBlock(src, methodName);

  return AUTH_METHOD_DECORATORS.filter((decorator) =>
    block.includes(decorator),
  );
}

describe('batch-create mutations inherit the single-create authorization stance', () => {
  const cases = [
    {
      batch: 'createTasks',
      file: join(graphqlDir, 'tasks', 'tasks.resolver.ts'),
      single: 'createTask',
    },
    {
      batch: 'createPlans',
      file: join(graphqlDir, 'plans', 'plans.resolver.ts'),
      single: 'createPlan',
    },
  ];

  test.each(cases)(
    'resolver file declaring $batch still declares a class-level stance',
    ({ file }) => {
      const src = readFileSync(file, 'utf8');
      expect(STANCE_MARKERS.some((marker) => src.includes(marker))).toBe(true);
    },
  );

  test.each(cases)(
    '$batch carries the same auth guards as $single',
    ({ batch, file, single }) => {
      const src = readFileSync(file, 'utf8');

      // Both mutations must exist (guards against a rename silently skipping the check).
      expect(src).toContain(`async ${single}(`);
      expect(src).toContain(`async ${batch}(`);

      expect(authDecoratorsFor(src, batch)).toEqual(
        authDecoratorsFor(src, single),
      );
    },
  );

  test.each(cases)(
    '$batch does not opt out of authentication with @Public',
    ({ batch, file }) => {
      const src = readFileSync(file, 'utf8');
      expect(methodDecoratorBlock(src, batch)).not.toContain('@Public');
    },
  );
});
