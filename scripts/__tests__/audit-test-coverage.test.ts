import { describe, expect, it } from 'vitest';
import {
  analyzeCoverage,
  classify,
  hasStrictFailure,
  rollup,
  type CoverageEntry,
  type CoverageStatus,
} from '../audit-test-coverage.ts';

const STUB = "test('FIXME: should be defined', () => {});";

/**
 * Build a readFile over an in-memory content map so the pure core can be driven
 * without the filesystem. Unlisted paths read as empty (no pragma, no stub).
 */
const reader =
  (contents: Record<string, string> = {}) =>
  (relativePath: string): string =>
    contents[relativePath] ?? '';

const statusOf = (
  entries: readonly CoverageEntry[],
  file: string,
): CoverageStatus => entries.find((e) => e.file === file)?.status ?? 'missing';

describe('classify', () => {
  it('classifies each enforced category by on-disk location', () => {
    expect(classify('applications/app-a/app/routes/home.tsx')).toBe('routes');
    expect(classify('applications/app-a/app/routes/api.data.ts')).toBe(
      'routes',
    );
    expect(
      classify('applications/app-a/app/routing/x/components/Card.tsx'),
    ).toBe('components');
    expect(classify('packages/pkg-a/src/hooks/useThing.ts')).toBe('hooks');
    expect(classify('applications/app-a/app/global/utils/format.ts')).toBe(
      'utils',
    );
  });

  it('classifies config and data as informational categories', () => {
    expect(classify('applications/app-a/app/global/config/defaults.ts')).toBe(
      'config',
    );
    expect(classify('packages/pkg-a/src/data/data.copy.ts')).toBe('data');
  });

  it('routes are flat — a nested app/routes/** file is not a route', () => {
    // Nested under routes/ with a components/ segment → components, not routes.
    expect(
      classify('applications/app-a/app/routes/settings/components/Panel.tsx'),
    ).toBe('components');
  });

  it('deepest category folder wins on overlap', () => {
    expect(
      classify('applications/app-a/app/x/components/Foo/hooks/useBar.ts'),
    ).toBe('hooks');
  });

  it('treats a .ts under components/ as not a component', () => {
    expect(classify('packages/pkg-a/src/components/helpers.ts')).toBeNull();
  });

  it('returns null for files outside app/ or src/ trees', () => {
    expect(classify('scripts/audit-test-coverage.ts')).toBeNull();
    expect(classify('packages/pkg-a/tests/hooks/useThing.ts')).toBeNull();
  });

  it.each([
    'applications/app-a/app/global/utils/format.test.tsx',
    'applications/app-a/app/global/utils/format.spec.ts',
    'applications/app-a/app/x/components/Card.stories.tsx',
    'applications/app-a/app/x/components/Card.example.tsx',
    'applications/app-a/app/x/components/render-test-utils.tsx',
    'applications/app-a/app/x/components/Card.server.tsx',
    'applications/app-a/app/routes/home.server.ts',
    'applications/app-a/app/__generated__/types.ts',
    'applications/app-a/app/routes/home.tsx.graphql',
    'applications/app-a/app/global/utils/types.d.ts',
    'applications/app-a/app/x/components/index.tsx',
    'applications/app-a/app/global/utils/index.ts',
    'applications/app-a/app/root.tsx',
    'applications/app-a/app/x/components/__tests__/Card.tsx',
  ])('excludes %s', (excluded) => {
    expect(classify(excluded)).toBeNull();
  });
});

describe('analyzeCoverage', () => {
  it('marks a sibling <Name>.test.tsx as tested', () => {
    const paths = [
      'packages/pkg-a/src/hooks/useThing.ts',
      'packages/pkg-a/src/hooks/useThing.test.tsx',
    ];
    const entries = analyzeCoverage(paths, reader());
    expect(statusOf(entries, 'packages/pkg-a/src/hooks/useThing.ts')).toBe(
      'tested',
    );
  });

  it('marks a __tests__/<Name>.test.tsx sibling folder spec as tested', () => {
    const paths = [
      'packages/pkg-a/src/hooks/useThing.ts',
      'packages/pkg-a/src/hooks/__tests__/useThing.test.tsx',
    ];
    const entries = analyzeCoverage(paths, reader());
    expect(statusOf(entries, 'packages/pkg-a/src/hooks/useThing.ts')).toBe(
      'tested',
    );
  });

  it('counts loader / deep-link test variants as tested', () => {
    const paths = [
      'applications/app-a/app/routes/settings.tsx',
      'applications/app-a/app/routes/__tests__/settings.loader.test.ts',
    ];
    const entries = analyzeCoverage(paths, reader());
    expect(
      statusOf(entries, 'applications/app-a/app/routes/settings.tsx'),
    ).toBe('tested');
  });

  it('does not match an unrelated spec whose name is a prefix', () => {
    // `useThingExtra.test.tsx` must NOT satisfy `useThing.ts`.
    const paths = [
      'packages/pkg-a/src/hooks/useThing.ts',
      'packages/pkg-a/src/hooks/useThingExtra.test.tsx',
    ];
    const entries = analyzeCoverage(paths, reader());
    expect(statusOf(entries, 'packages/pkg-a/src/hooks/useThing.ts')).toBe(
      'missing',
    );
  });

  it('reports a placeholder spec as stub, not tested', () => {
    const paths = [
      'packages/pkg-a/src/hooks/useThing.ts',
      'packages/pkg-a/src/hooks/__tests__/useThing.test.tsx',
    ];
    const entries = analyzeCoverage(paths, (p) =>
      p.endsWith('useThing.test.tsx') ? STUB : '',
    );
    expect(statusOf(entries, 'packages/pkg-a/src/hooks/useThing.ts')).toBe(
      'stub',
    );
  });

  it('honors the first-line opt-out pragma (excluded from missing)', () => {
    const paths = ['packages/pkg-a/src/utils/legacy.ts'];
    const entries = analyzeCoverage(paths, (p) =>
      p.endsWith('legacy.ts')
        ? '// test-coverage: opt-out — vendored\nexport const x = 1;'
        : '',
    );
    expect(statusOf(entries, 'packages/pkg-a/src/utils/legacy.ts')).toBe(
      'opt-out',
    );
  });

  it('classifies config and data as informational and reports them', () => {
    const paths = [
      'applications/app-a/app/global/config/defaults.ts',
      'packages/pkg-a/src/data/data.copy.ts',
    ];
    const entries = analyzeCoverage(paths, reader());
    const config = entries.find((e) => e.category === 'config');
    const data = entries.find((e) => e.category === 'data');
    expect(config?.status).toBe('missing');
    expect(data?.status).toBe('missing');
  });
});

describe('hasStrictFailure', () => {
  it('fails when an enforced-category file is missing', () => {
    const entries = analyzeCoverage(
      ['packages/pkg-a/src/hooks/useThing.ts'],
      reader(),
    );
    expect(hasStrictFailure(entries)).toBe(true);
  });

  it('does not fail for missing config/data (never gated)', () => {
    const entries = analyzeCoverage(
      [
        'applications/app-a/app/global/config/defaults.ts',
        'packages/pkg-a/src/data/data.copy.ts',
      ],
      reader(),
    );
    expect(entries.every((e) => e.status === 'missing')).toBe(true);
    expect(hasStrictFailure(entries)).toBe(false);
  });

  it('does not fail when every enforced file is tested', () => {
    const entries = analyzeCoverage(
      [
        'packages/pkg-a/src/hooks/useThing.ts',
        'packages/pkg-a/src/hooks/useThing.test.tsx',
      ],
      reader(),
    );
    expect(hasStrictFailure(entries)).toBe(false);
  });
});

describe('rollup', () => {
  it('aggregates per project + category with missing/stub file lists', () => {
    const entries = analyzeCoverage(
      [
        'packages/pkg-a/src/hooks/useA.ts',
        'packages/pkg-a/src/hooks/useA.test.tsx',
        'packages/pkg-a/src/hooks/useB.ts',
        'packages/pkg-a/src/hooks/__tests__/useC.test.tsx',
        'packages/pkg-a/src/hooks/useC.ts',
      ],
      (p) => (p.endsWith('useC.test.tsx') ? STUB : ''),
    );
    const hooks = rollup(entries).find(
      (r) => r.project === 'packages/pkg-a' && r.category === 'hooks',
    );
    expect(hooks?.total).toBe(3);
    expect(hooks?.tested).toBe(1);
    expect(hooks?.stub).toBe(1);
    expect(hooks?.missing).toBe(1);
    expect(hooks?.enforced).toBe(true);
    expect(hooks?.missingFiles).toEqual(['packages/pkg-a/src/hooks/useB.ts']);
    expect(hooks?.stubFiles).toEqual(['packages/pkg-a/src/hooks/useC.ts']);
  });
});
