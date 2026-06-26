import { describe, expect, it } from 'vitest';

import {
  findCatalogViolations,
  isAllowedSpec,
} from './check-catalog-coverage.ts';

describe('isAllowedSpec', () => {
  it('allows catalog protocol specs', () => {
    expect(isAllowedSpec('catalog:')).toBe(true);
    expect(isAllowedSpec('catalog:react19')).toBe(true);
  });

  it('allows workspace protocol specs', () => {
    expect(isAllowedSpec('workspace:^')).toBe(true);
    expect(isAllowedSpec('workspace:*')).toBe(true);
  });

  it('rejects literal version specs', () => {
    expect(isAllowedSpec('1.2.3')).toBe(false);
    expect(isAllowedSpec('^1.2.3')).toBe(false);
    expect(isAllowedSpec('~1.2.3')).toBe(false);
    expect(isAllowedSpec('*')).toBe(false);
    expect(isAllowedSpec('npm:react@18')).toBe(false);
  });
});

describe('findCatalogViolations', () => {
  it('returns no violations when every spec is catalog/workspace', () => {
    const violations = findCatalogViolations([
      {
        file: 'packages/clean/package.json',
        manifest: {
          dependencies: { react: 'catalog:react19' },
          devDependencies: { '@openthrottle/utils': 'workspace:^' },
        },
      },
    ]);

    expect(violations).toEqual([]);
  });

  it('flags a literal version in dependencies', () => {
    const violations = findCatalogViolations([
      {
        file: 'packages/dirty/package.json',
        manifest: {
          dependencies: { lodash: '4.17.21' },
        },
      },
    ]);

    expect(violations).toEqual([
      {
        dependency: 'lodash',
        file: 'packages/dirty/package.json',
        section: 'dependencies',
        spec: '4.17.21',
      },
    ]);
  });

  it('checks dependencies, devDependencies, and optionalDependencies', () => {
    const violations = findCatalogViolations([
      {
        file: 'packages/all-sections/package.json',
        manifest: {
          dependencies: { a: '1.0.0' },
          devDependencies: { b: '^2.0.0' },
          optionalDependencies: { c: '~3.0.0' },
        },
      },
    ]);

    expect(violations.map((v) => v.section).sort()).toEqual([
      'dependencies',
      'devDependencies',
      'optionalDependencies',
    ]);
  });

  it('ignores peerDependencies (exempt by policy)', () => {
    const violations = findCatalogViolations([
      {
        file: 'packages/peer/package.json',
        manifest: {
          peerDependencies: { react: '>=18' },
        },
      },
    ]);

    expect(violations).toEqual([]);
  });

  it('tolerates manifests with no dependency sections', () => {
    const violations = findCatalogViolations([
      {
        file: 'packages/empty/package.json',
        manifest: { name: 'empty' } as unknown as Record<
          string,
          Record<string, string> | undefined
        >,
      },
    ]);

    expect(violations).toEqual([]);
  });

  it('aggregates violations across multiple manifests', () => {
    const violations = findCatalogViolations([
      {
        file: 'packages/one/package.json',
        manifest: { dependencies: { a: '1.0.0' } },
      },
      {
        file: 'packages/two/package.json',
        manifest: { dependencies: { b: 'catalog:' } },
      },
      {
        file: 'packages/three/package.json',
        manifest: { devDependencies: { c: '2.0.0' } },
      },
    ]);

    expect(violations).toHaveLength(2);
    expect(violations.map((v) => v.file)).toEqual([
      'packages/one/package.json',
      'packages/three/package.json',
    ]);
  });
});
