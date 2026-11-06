import { describe, expect, it } from 'vitest';

import type { DeclaredSideEffects, ModuleScan } from '../check-side-effects.ts';
import {
  buildDirectoryOf,
  emittedPathOf,
  judgeProject,
  matchesAnyGlob,
  normalizeGlob,
  recommend,
  resolveRelativeImport,
  scanModule,
  SIDE_EFFECT_KIND,
  VERDICT,
} from '../check-side-effects.ts';

const kindsOf = (text: string, fileName = 'src/module.ts'): string[] => {
  return scanModule(fileName, text).findings.map((finding) => {
    return finding.kind;
  });
};

const judge = (
  declared: DeclaredSideEffects,
  modules: Readonly<Record<string, string>>,
  styleFiles: readonly string[] = [],
  buildDirectory: string | undefined = undefined,
): ReturnType<typeof judgeProject> => {
  const scans: Record<string, ModuleScan> = {};
  for (const [file, text] of Object.entries(modules)) {
    scans[file] = scanModule(file, text);
  }

  return judgeProject({
    buildDirectory,
    declared,
    files: Object.keys(modules),
    name: '@test/pkg',
    path: 'packages/pkg',
    scans,
    styleFiles,
  });
};

describe('check-side-effects', () => {
  describe('scanModule', () => {
    describe('clean modules', () => {
      it('treats declarations, re-exports and type-only constructs as clean', () => {
        const text = [
          "import type { A } from './a.ts';",
          "import { b } from './b.ts';",
          "export * from './c.ts';",
          'export interface Shape { readonly a: A }',
          'export type Alias = string;',
          'export function f(): number { return b; }',
          'export class K {}',
          'export enum E { A }',
          'declare global { interface Window { x: number } }',
        ].join('\n');

        expect(kindsOf(text)).toEqual([]);
      });

      it('treats a bound call as clean — it constructs a value', () => {
        expect(kindsOf('export const store = createStore();')).toEqual([]);
      });

      it('treats a directive prologue as clean', () => {
        expect(kindsOf("'use client';\nexport const x = 1;")).toEqual([]);
      });

      it('treats a /* @__PURE__ */ call as clean', () => {
        expect(kindsOf('/* @__PURE__ */ build();')).toEqual([]);
      });

      it('treats an assignment to a local binding property as clean', () => {
        const text = [
          'const Button = () => null;',
          "Button.displayName = 'Button';",
          'export { Button };',
        ].join('\n');

        expect(kindsOf(text)).toEqual([]);
      });

      it('treats an await inside a nested function as clean', () => {
        expect(kindsOf('export const f = async () => { await g(); };')).toEqual([]); // prettier-ignore
      });

      it('treats a type-only import as clean', () => {
        expect(kindsOf("import type {} from './types.ts';")).toEqual([]);
      });
    });

    describe('side effects', () => {
      it('flags a discarded call', () => {
        expect(kindsOf('registerEnumType(Status, { name: "Status" });')).toEqual([SIDE_EFFECT_KIND.DISCARDED_EXPRESSION]); // prettier-ignore
      });

      it('flags an assignment to a global', () => {
        expect(kindsOf('globalThis.Temporal = Temporal;')).toEqual([SIDE_EFFECT_KIND.DISCARDED_EXPRESSION]); // prettier-ignore
      });

      it('flags an assignment to a property of an imported binding', () => {
        const text = "import { faker } from 'faker';\nfaker.locale = 'de';";

        expect(kindsOf(text)).toEqual([SIDE_EFFECT_KIND.DISCARDED_EXPRESSION]);
      });

      it('flags an IIFE', () => {
        expect(kindsOf('(() => { install(); })();')).toEqual([SIDE_EFFECT_KIND.DISCARDED_EXPRESSION]); // prettier-ignore
      });

      it('flags top-level control flow', () => {
        expect(kindsOf('if (process.env.X) { throw new Error(); }')).toEqual([SIDE_EFFECT_KIND.CONTROL_FLOW]); // prettier-ignore
      });

      it('flags top-level await, even in an initializer', () => {
        expect(kindsOf('export const config = await load();')).toEqual([SIDE_EFFECT_KIND.TOP_LEVEL_AWAIT]); // prettier-ignore
      });

      it('flags a bare import of a package', () => {
        expect(kindsOf("import 'reflect-metadata';")).toEqual([SIDE_EFFECT_KIND.BARE_IMPORT]); // prettier-ignore
      });

      it('flags an empty named import as bare', () => {
        expect(kindsOf("import {} from 'polyfill';")).toEqual([SIDE_EFFECT_KIND.BARE_IMPORT]); // prettier-ignore
      });
    });

    describe('imports that are recorded, not flagged', () => {
      it('records a stylesheet import without flagging the importer', () => {
        const scan = scanModule('src/Calendar.tsx', "import './calendar.css';");

        expect(scan.findings).toEqual([]);
        expect(scan.styleImports).toEqual(['./calendar.css']);
      });

      it('records a relative bare import for its target', () => {
        const scan = scanModule('src/a.ts', "import './bootstrap.ts';");

        expect(scan.findings).toEqual([]);
        expect(scan.effectImports).toEqual([{ line: 1, specifier: './bootstrap.ts' }]); // prettier-ignore
      });
    });

    it('counts decorated classes without flagging them', () => {
      const scan = scanModule('src/s.ts', '@Injectable()\nexport class S {}');

      expect(scan.decoratedClasses).toBe(1);
      expect(scan.findings).toEqual([]);
    });
  });

  describe('globs', () => {
    it('treats a slash-free entry as a basename anywhere', () => {
      expect(normalizeGlob('*.css')).toBe('**/*.css');
    });

    it('strips a leading ./', () => {
      expect(normalizeGlob('./src/a.ts')).toBe('src/a.ts');
    });

    it('matches package-relative paths', () => {
      expect(matchesAnyGlob('src/utils/datetime.ts', ['**/datetime.ts'])).toBe(true); // prettier-ignore
      expect(matchesAnyGlob('src/utils/datetime.ts', ['./src/other.ts'])).toBe(false); // prettier-ignore
    });
  });

  describe('recommend', () => {
    it('recommends false when nothing is flagged', () => {
      expect(recommend([], [])).toBe(false);
    });

    it('lists stylesheet globs first, then exact module paths', () => {
      expect(recommend(['src/b.ts', 'src/a.ts'], ['src/x.css'])).toEqual([
        '**/*.css',
        './src/a.ts',
        './src/b.ts',
      ]);
    });
  });

  describe('built packages', () => {
    it('finds the build directory a dist main points into', () => {
      expect(buildDirectoryOf('./dist/src/index.js')).toBe('dist');
    });

    it('treats a source main as unbuilt', () => {
      expect(buildDirectoryOf('./src/index.ts')).toBeUndefined();
      expect(buildDirectoryOf(undefined)).toBeUndefined();
    });

    it('maps a source module to its emitted path', () => {
      expect(emittedPathOf('src/bin.ts', 'dist')).toBe('dist/src/bin.js');
      expect(emittedPathOf('src/x.mts', 'dist')).toBe('dist/src/x.mjs');
    });

    it('recommends both the source and the emitted path', () => {
      const report = judge(undefined, { 'src/bin.ts': 'main();' }, [], 'dist');

      expect(report.recommended).toEqual(['./dist/src/bin.js', './src/bin.ts']);
    });

    it('reports a source-only listing as unlisted', () => {
      const report = judge(['./src/bin.ts'], { 'src/bin.ts': 'main();' }, [], 'dist'); // prettier-ignore

      expect(report.unlisted).toEqual(['dist/src/bin.js']);
    });

    it('never reports an emitted path as stale', () => {
      const report = judge(
        ['./dist/src/bin.js', './src/bin.ts'],
        { 'src/bin.ts': 'main();' },
        [],
        'dist',
      );

      expect(report.verdict).toBe(VERDICT.OK);
    });
  });

  describe('resolveRelativeImport', () => {
    const files = new Set(['src/utils/boot.ts', 'src/ui/index.tsx']);

    it('resolves an extensionless specifier', () => {
      expect(resolveRelativeImport('src/a.ts', './utils/boot', files)).toBe('src/utils/boot.ts'); // prettier-ignore
    });

    it('resolves a .js specifier to its .ts source', () => {
      expect(resolveRelativeImport('src/a.ts', './utils/boot.js', files)).toBe('src/utils/boot.ts'); // prettier-ignore
    });

    it('resolves a folder to its index', () => {
      expect(resolveRelativeImport('src/a.ts', './ui', files)).toBe('src/ui/index.tsx'); // prettier-ignore
    });

    it('returns undefined outside the project', () => {
      expect(resolveRelativeImport('src/a.ts', '../../elsewhere', files)).toBeUndefined(); // prettier-ignore
    });
  });

  describe('judgeProject', () => {
    const clean = { 'src/index.ts': 'export const a = 1;' };

    describe('when the field is missing', () => {
      it('reports missing and recommends false for a clean project', () => {
        const report = judge(undefined, clean);

        expect(report.verdict).toBe(VERDICT.MISSING);
        expect(report.recommended).toBe(false);
      });
    });

    describe('when the field is true', () => {
      it('reports declared-true', () => {
        expect(judge(true, clean).verdict).toBe(VERDICT.DECLARED_TRUE);
      });
    });

    describe('when the field is false', () => {
      it('is ok for a clean project', () => {
        expect(judge(false, clean).verdict).toBe(VERDICT.OK);
      });

      it('reports an unlisted side-effect module', () => {
        const report = judge(false, { 'src/boot.ts': 'install();' });

        expect(report.verdict).toBe(VERDICT.UNLISTED);
        expect(report.unlisted).toEqual(['src/boot.ts']);
      });

      it('charges a relative bare import to its target, not the importer', () => {
        const report = judge(false, {
          'src/Calendar.tsx': "import './boot';\nexport const C = 1;",
          'src/boot.ts': "import 'temporal-polyfill/global';",
        });

        expect(report.unlisted).toEqual(['src/boot.ts']);
        expect(report.recommended).toEqual(['./src/boot.ts']);
      });

      it('requires imported stylesheets to be listed, not their importers', () => {
        const report = judge(
          false,
          { 'src/Calendar.tsx': "import './calendar.css';" },
          ['src/calendar.css'],
        );

        expect(report.unlisted).toEqual(['src/calendar.css']);
        expect(report.recommended).toEqual(['**/*.css']);
      });

      it('requires a shipped stylesheet even when only consumers import it', () => {
        const report = judge(false, clean, ['src/index.css']);

        expect(report.verdict).toBe(VERDICT.UNLISTED);
        expect(report.recommended).toEqual(['**/*.css']);
      });
    });

    describe('when the field is an array', () => {
      it('is ok when every side-effect file is listed', () => {
        const report = judge(['**/boot.ts'], { 'src/boot.ts': 'install();' });

        expect(report.verdict).toBe(VERDICT.OK);
      });

      it('reports an entry that matches no file as stale', () => {
        const report = judge(['./src/gone.ts'], clean);

        expect(report.verdict).toBe(VERDICT.STALE_ENTRY);
        expect(report.staleEntries).toEqual(['./src/gone.ts']);
      });
    });
  });
});
