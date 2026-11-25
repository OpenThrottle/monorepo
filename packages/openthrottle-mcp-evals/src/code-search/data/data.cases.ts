import type { CodeSearchCase } from '../eval-case.ts';

/**
 * @description The code-search cases, labelled against the OpenThrottle monorepo tree on 2026-11-24.
 * `parseDate` is the probe that first showed code search returning nothing; the other three are the
 * historical duplicates measured in the ot-code-review duplication recipe (§ Measured results),
 * whose gold set is the home that exists on the current tree. Ids are stable — reports key on them.
 */
export const CODE_SEARCH_CASES: readonly CodeSearchCase[] = [
  {
    id: 'body-parse-date',
    kind: 'body',
    origin: 'ot-code-review probe (plan 25303f28)',
    query: `const parseDate = (value: string | null | undefined): Date | null => { if (value === null || value === undefined || value === '') return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; }`,
    relevantPaths: [
      'applications/openthrottle-developer/app/global/utils/dates.ts',
    ],
  },
  {
    id: 'intent-parse-date',
    kind: 'intent',
    origin: 'ot-code-review probe (plan 25303f28)',
    query: `parse an ISO date string into a Date, returning null when it is empty or invalid`,
    relevantPaths: [
      'applications/openthrottle-developer/app/global/utils/dates.ts',
    ],
  },
  {
    id: 'intent-skill-source-badge',
    kind: 'intent',
    origin: 'PR #479',
    query: `label, color and tooltip for a skill's source badge (OpenThrottle, external, personal)`,
    relevantPaths: [
      'applications/openthrottle-developer/app/routing/skills/utils/filterSkillsBySource.ts',
      'applications/openthrottle-developer/app/routing/skills/utils/getSkillSourceBadge.ts',
    ],
  },
  {
    id: 'intent-checkout-to-container-path',
    kind: 'intent',
    origin: 'PR #956',
    query: `resolve a user's registered checkout id to its filesystem path in this process's view, checking ownership`,
    relevantPaths: [
      'applications/openthrottle-server/src/services/checkout-path-resolution/checkout-path-resolution.service.ts',
      'applications/openthrottle-server/src/services/checkout-path/checkout-path.service.ts',
    ],
  },
  {
    id: 'intent-parse-dotenv',
    kind: 'intent',
    origin: 'PR #838',
    query: `parse .env file contents into a key/value map, stripping quotes and an export prefix`,
    relevantPaths: [
      'packages/agentic-hooks/src/config/env.ts',
      'scripts/utils/env.ts',
    ],
  },
];
