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
