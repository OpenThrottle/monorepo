/**
 * @description Commit types `@commitlint/config-conventional` accepts, by the plan or task category
 * that implies them. A category not listed falls back to {@link DEFAULT_COMMIT_TYPE}.
 */
export const COMMIT_TYPE_BY_CATEGORY: Readonly<Record<string, string>> = {
  bug: 'fix',
  bugfix: 'fix',
  build: 'build',
  chore: 'chore',
  ci: 'ci',
  cleanup: 'chore',
  doc: 'docs',
  docs: 'docs',
  documentation: 'docs',
  feat: 'feat',
  feature: 'feat',
  fix: 'fix',
  implementation: 'feat',
  maintenance: 'chore',
  perf: 'perf',
  performance: 'perf',
  refactor: 'refactor',
  test: 'test',
  testing: 'test',
  tests: 'test',
};

/** @description The type for a category nothing maps: the one that claims least about the change. */
export const DEFAULT_COMMIT_TYPE = 'chore';

/** @description commitlint's `header-max-length` and `body-max-line-length` (config-conventional). */
export const COMMIT_LINE_MAX = 100;

/** @description Prefix for a generated branch name. */
export const BRANCH_PREFIX = 'ot/';

/** @description Longest slug a generated branch name carries before the plan-id suffix. */
export const BRANCH_SLUG_MAX = 48;

/**
 * @description The headings of `.github/pull_request_template.md`, in order. A parity test reads the
 * template and fails when this drifts, because a deployed server has no checkout to read it from.
 */
export const PULL_REQUEST_TEMPLATE_HEADINGS: readonly string[] = [
  '# Summary',
  '## Testing',
  '## Review focus',
  '## Follow-ups',
];

/**
 * @description Twin of `OT_ATTRIBUTION_ALTERNATION` in
 * `skills/github-pull-request/scripts/attribution-patterns.sh`, the single definition of a
 * tool/model credit. A parity test reads that file and fails when this drifts.
 */
export const ATTRIBUTION_ALTERNATION = `(co-authored-by:|made-with:|generated with |made with |🤖)`;
