import { planStageFiles } from './plan-stage-files.ts';

const store = (id: string, name: string, rest = 'index.js'): string => {
  return `node_modules/.pnpm/${id}/node_modules/${name}/${rest}`;
};
const dir = (id: string, name: string): string => {
  return `node_modules/.pnpm/${id}/node_modules/${name}`;
};
const appLink = (name: string): string => {
  return `applications/openthrottle-developer/node_modules/${name}`;
};

describe('planStageFiles', () => {
  describe('a flat closure', () => {
    const traced = [
      'applications/openthrottle-developer/build/server/index.js',
      appLink('a'),
      store('a@1.0.0', 'a'),
      store('a@1.0.0', 'a', 'package.json'),
      `node_modules/.pnpm/a@1.0.0/node_modules/b`,
      store('b@2.0.0', 'b'),
    ];
    const links = [
      { from: appLink('a'), to: dir('a@1.0.0', 'a') },
      {
        from: 'node_modules/.pnpm/a@1.0.0/node_modules/b',
        to: dir('b@2.0.0', 'b'),
      },
    ];

    it('hoists every package to the top level', () => {
      const result = planStageFiles(traced, links);

      expect(result.ok && result.copies.map((copy) => copy.to)).toEqual([
        'node_modules/a/index.js',
        'node_modules/a/package.json',
        'node_modules/b/index.js',
      ]);
    });

    it('ignores the app build folders and the app links', () => {
      const result = planStageFiles(traced, links);

      expect(result.ok && result.packages).toEqual([
        { dir: 'node_modules/a', name: 'a', version: '1.0.0' },
        { dir: 'node_modules/b', name: 'b', version: '2.0.0' },
      ]);
    });
  });

  describe('a version clash', () => {
    const traced = [
      store('a@1.0.0', 'a'),
      store('old@1.0.0', 'old'),
      store('ms@2.0.0', 'ms'),
      store('ms@2.1.3', 'ms'),
      store('dbg@2.6.9', 'dbg'),
      store('dbg@4.4.3', 'dbg'),
    ];
    const links = [
      { from: appLink('a'), to: dir('a@1.0.0', 'a') },
      { from: appLink('dbg'), to: dir('dbg@4.4.3', 'dbg') },
      {
        from: 'node_modules/.pnpm/a@1.0.0/node_modules/old',
        to: dir('old@1.0.0', 'old'),
      },
      {
        from: 'node_modules/.pnpm/old@1.0.0/node_modules/dbg',
        to: dir('dbg@2.6.9', 'dbg'),
      },
      {
        from: 'node_modules/.pnpm/dbg@2.6.9/node_modules/ms',
        to: dir('ms@2.0.0', 'ms'),
      },
      {
        from: 'node_modules/.pnpm/dbg@4.4.3/node_modules/ms',
        to: dir('ms@2.1.3', 'ms'),
      },
    ];

    it('nests the version the importer needs under that importer', () => {
      const result = planStageFiles(traced, links);

      expect(result.ok && result.packages.map((pkg) => pkg.dir)).toEqual([
        'node_modules/a',
        'node_modules/dbg',
        'node_modules/ms',
        'node_modules/old',
        'node_modules/old/node_modules/dbg',
        'node_modules/old/node_modules/dbg/node_modules/ms',
      ]);
    });

    it('keeps each version at the folder that resolves to it', () => {
      const result = planStageFiles(traced, links);
      const versions =
        result.ok &&
        Object.fromEntries(
          result.packages.map((pkg) => [pkg.dir, pkg.version]),
        );

      expect(versions).toMatchObject({
        'node_modules/dbg': '4.4.3',
        'node_modules/old/node_modules/dbg': '2.6.9',
        'node_modules/old/node_modules/dbg/node_modules/ms': '2.0.0',
      });
    });
  });

  describe('failure cases', () => {
    it('fails on a traced file it cannot place', () => {
      const result = planStageFiles(['somewhere/else/file.js'], []);

      expect(result.ok).toBe(false);
    });

    it('fails when a traced package is reached by no link', () => {
      const result = planStageFiles([store('lost@1.0.0', 'lost')], []);

      expect(!result.ok && result.reasons.join()).toContain('lost@1.0.0');
    });

    it('fails when the two apps resolve a package differently', () => {
      const result = planStageFiles(
        [store('r@1.0.0', 'r'), store('r@2.0.0', 'r')],
        [
          { from: appLink('r'), to: dir('r@1.0.0', 'r') },
          {
            from: 'applications/openthrottle-app/node_modules/r',
            to: dir('r@2.0.0', 'r'),
          },
        ],
      );

      expect(!result.ok && result.reasons.join()).toContain('r');
    });
  });

  describe('the .env exclusion', () => {
    it('never plans a .env file, even if the tracer reports one', () => {
      const result = planStageFiles(
        [
          store('a@1.0.0', 'a'),
          store('a@1.0.0', 'a', '.env'),
          store('a@1.0.0', 'a', '.env.local'),
        ],
        [{ from: appLink('a'), to: dir('a@1.0.0', 'a') }],
      );

      expect(result.ok && result.copies.map((copy) => copy.to)).toEqual([
        'node_modules/a/index.js',
      ]);
      expect(result.ok && result.excluded).toHaveLength(2);
    });
  });

  describe('phantom requires', () => {
    it('skips packages reached only through the pnpm virtual-store hoist', () => {
      const result = planStageFiles(
        [
          store('a@1.0.0', 'a'),
          store('sms@0.5.19', 'sms'),
          store('bf@1.1.2', 'bf'),
          'node_modules/.pnpm/node_modules/sms',
          'node_modules/.pnpm/sms@0.5.19/node_modules/bf',
        ],
        [
          { from: appLink('a'), to: dir('a@1.0.0', 'a') },
          {
            from: 'node_modules/.pnpm/node_modules/sms',
            to: dir('sms@0.5.19', 'sms'),
          },
          {
            from: 'node_modules/.pnpm/sms@0.5.19/node_modules/bf',
            to: dir('bf@1.1.2', 'bf'),
          },
        ],
      );

      expect(result.ok && result.skippedPhantoms).toEqual([
        'bf@1.1.2',
        'sms@0.5.19',
      ]);
    });
  });
});
