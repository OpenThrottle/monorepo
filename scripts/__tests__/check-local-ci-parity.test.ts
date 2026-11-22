import { describe, expect, it } from 'vitest';

import type { CommandSources } from '../check-local-ci-parity.ts';
import {
  collectSignatures,
  compareParity,
  extractJobText,
  main,
} from '../check-local-ci-parity.ts';

const sources = (
  scripts: Record<string, string>,
  targets: CommandSources['targets'] = {},
): CommandSources => {
  return { scripts, targets };
};

describe('check-local-ci-parity', () => {
  describe('extractJobText', () => {
    const workflow = [
      'jobs:',
      '  build:',
      '    steps:',
      '      - run: pnpm run build-only',
      '  gates:',
      '    steps:',
      '      # pnpm run commented-out',
      '      - run: pnpm run kept',
      '  later:',
      '    steps:',
      '      - run: pnpm run other',
    ].join('\n');

    describe('when the job exists', () => {
      it('returns its body up to the next job, without comment lines', () => {
        const text = extractJobText(workflow, 'gates');

        expect(text).toContain('pnpm run kept');
        expect(text).not.toContain('commented-out');
        expect(text).not.toContain('pnpm run other');
        expect(text).not.toContain('build-only');
      });
    });

    describe('when the job is missing', () => {
      it('returns undefined', () => {
        expect(extractJobText(workflow, 'nope')).toBeUndefined();
      });
    });
  });

  describe('collectSignatures', () => {
    describe('when a script calls other scripts', () => {
      it('expands to the leaf commands they run', () => {
        const signatures = collectSignatures(
          'pnpm run outer',
          sources({
            inner: 'tsx ./scripts/inner.ts --strict',
            outer: 'pnpm run inner && pnpm exec tsx scripts/outer.ts',
          }),
        );

        expect([...signatures].sort()).toEqual([
          'tsx scripts/inner.ts',
          'tsx scripts/outer.ts',
        ]);
      });
    });

    describe('when a script is referenced by a regex glob', () => {
      it('expands every matching script', () => {
        const signatures = collectSignatures(
          'pnpm run "/^audit:(?!skip).*:strict$/"',
          sources({
            'audit:a:strict': 'tsx ./scripts/a.ts',
            'audit:b:strict': 'tsx ./scripts/b.ts',
            'audit:skip:strict': 'tsx ./scripts/skip.ts',
          }),
        );

        expect([...signatures].sort()).toEqual([
          'tsx scripts/a.ts',
          'tsx scripts/b.ts',
        ]);
      });
    });

    describe('when a script is called without `run`', () => {
      it('expands it, but not `pnpm nx` or `pnpm exec`', () => {
        const signatures = collectSignatures(
          'pnpm nx:validate && pnpm nx run app:lint',
          sources({ 'nx:validate': 'tsx ./scripts/validate.ts' }),
        );

        expect([...signatures].sort()).toEqual([
          'nx run app:lint',
          'tsx scripts/validate.ts',
        ]);
      });
    });

    describe('when a root-project target is run', () => {
      it('expands its command, configuration and commands list', () => {
        const signatures = collectSignatures(
          'nx run monorepo:one && nx run monorepo:two:check && nx run monorepo:three',
          sources(
            {},
            {
              one: { command: 'tsx ./scripts/one.ts', configurations: {} },
              three: {
                command: `bash skills/x/sync.sh --check\ntsx ./scripts/three.ts`,
                configurations: {},
              },
              two: {
                command: undefined,
                configurations: { check: 'tsx ./scripts/two.ts --check' },
              },
            },
          ),
        );

        expect([...signatures].sort()).toEqual([
          'bash skills/x/sync.sh',
          'tsx scripts/one.ts',
          'tsx scripts/three.ts',
          'tsx scripts/two.ts',
        ]);
      });
    });

    describe('when a script or target runs nothing recognisable', () => {
      it('keeps it as a leaf named for how it was invoked', () => {
        const signatures = collectSignatures(
          'pnpm run gen && nx run monorepo:format:check',
          sources(
            { gen: 'node ./scripts/gen.mjs' },
            {
              format: {
                command: undefined,
                configurations: { check: 'prettier --check .' },
              },
            },
          ),
        );

        expect([...signatures].sort()).toEqual([
          'nx run monorepo:format:check',
          'pnpm run gen',
        ]);
      });
    });

    describe('when nx run-many is used', () => {
      it('keeps the target and configuration and ignores the projects', () => {
        const signatures = collectSignatures(
          'pnpm exec nx run-many --target=verify --projects=a,b\npnpm nx run-many --target=cms --configuration=check',
          sources({}),
        );

        expect([...signatures].sort()).toEqual([
          'nx run-many --target=cms --configuration=check',
          'nx run-many --target=verify',
        ]);
      });
    });

    describe('when scripts call each other in a cycle', () => {
      it('terminates', () => {
        const signatures = collectSignatures(
          'pnpm run a',
          sources({ a: 'pnpm run b', b: 'pnpm run a && tsx ./scripts/b.ts' }),
        );

        expect([...signatures]).toEqual(['tsx scripts/b.ts']);
      });
    });
  });

  describe('compareParity', () => {
    describe('when CI runs a check local does not', () => {
      it('reports it as missing', () => {
        const report = compareParity(
          new Set(['tsx scripts/a.ts', 'tsx scripts/b.ts']),
          new Set(['tsx scripts/a.ts']),
          [],
        );

        expect(report.missing).toEqual(['tsx scripts/b.ts']);
      });
    });

    describe('when the missing check is exempt', () => {
      it('does not report it', () => {
        const report = compareParity(new Set(['tsx scripts/b.ts']), new Set(), [
          { reason: 'needs the PR', signature: 'tsx scripts/b.ts' },
        ]);

        expect(report).toEqual({ missing: [], staleExemptions: [] });
      });
    });

    describe('when an exemption is no longer run by CI', () => {
      it('reports it as stale', () => {
        const report = compareParity(new Set(), new Set(), [
          { reason: 'gone', signature: 'tsx scripts/gone.ts' },
        ]);

        expect(report.staleExemptions).toEqual(['tsx scripts/gone.ts']);
      });
    });
  });

  describe('main', () => {
    it('passes on this repository', () => {
      expect(main()).toBe(0);
    });
  });
});
