import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ATTRIBUTE_EXEMPT_PATHS,
  checkAttributes,
  findBannerPaths,
  findUnmarkedPaths,
  GENERATED_BANNERS,
  hasBannerHeader,
  HEADER_LINES,
  suggestGlob,
} from '../check-generated-attributes.ts';
import { run } from '../lib/exec.ts';

const BANNER = GENERATED_BANNERS[0] ?? '';

describe('check-generated-attributes', () => {
  let repoRoot: string;

  const write = (path: string, contents: string): void => {
    const absolute = join(repoRoot, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents);
  };

  const trackEverything = (): void => {
    run('git', ['-C', repoRoot, 'add', '--all']);
  };

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ot-genattr-'));
    run('git', ['init', '--quiet', repoRoot]);
  });

  afterEach(() => {
    rmSync(repoRoot, { force: true, recursive: true });
  });

  describe('hasBannerHeader', () => {
    it('accepts a banner in the header', () => {
      write('out.cjs', `// ${BANNER}\nconsole.log(1);\n`);

      expect(hasBannerHeader(repoRoot, 'out.cjs')).toBe(true);
    });

    it('rejects a banner past the header — that file is the generator', () => {
      const padding = Array.from({ length: HEADER_LINES + 5 }, () => '//').join(
        '\n',
      );
      write('generator.ts', `${padding}\nconst banner = '${BANNER}';\n`);

      expect(hasBannerHeader(repoRoot, 'generator.ts')).toBe(false);
    });

    it('returns false for a path that cannot be read', () => {
      expect(hasBannerHeader(repoRoot, 'missing.cjs')).toBe(false);
    });

    it('recognizes every banner wording in use', () => {
      for (const [index, banner] of GENERATED_BANNERS.entries()) {
        write(`out-${index}.txt`, `# ${banner}\nbody\n`);

        expect(hasBannerHeader(repoRoot, `out-${index}.txt`)).toBe(true);
      }
    });
  });

  describe('findBannerPaths', () => {
    it('finds tracked banner-headed files and skips the generator', () => {
      write('hooks/payload.cjs', `// ${BANNER}\n`);
      write('authored.ts', '// ordinary source\n');
      const padding = Array.from({ length: HEADER_LINES + 5 }, () => '//').join(
        '\n',
      );
      write('generator.ts', `${padding}\nconst banner = '${BANNER}';\n`);
      trackEverything();

      expect(findBannerPaths(repoRoot)).toEqual(['hooks/payload.cjs']);
    });

    it('ignores an untracked payload — git grep only sees tracked files', () => {
      write('hooks/payload.cjs', `// ${BANNER}\n`);

      expect(findBannerPaths(repoRoot)).toEqual([]);
    });
  });

  describe('the fail path', () => {
    it('reports a banner-headed file with no .gitattributes entry', () => {
      write('hooks/payload.cjs', `// ${BANNER}\n`);
      trackEverything();

      const statuses = checkAttributes(repoRoot, findBannerPaths(repoRoot));

      expect(statuses).toEqual([{ marked: false, path: 'hooks/payload.cjs' }]);
      expect(findUnmarkedPaths(statuses)).toEqual(['hooks/payload.cjs']);
    });
  });

  describe('the pass path', () => {
    it('accepts a file a .gitattributes glob marks generated', () => {
      write('.gitattributes', 'hooks/*.cjs -diff linguist-generated=true\n');
      write('hooks/payload.cjs', `// ${BANNER}\n`);
      trackEverything();

      const statuses = checkAttributes(repoRoot, ['hooks/payload.cjs']);

      expect(statuses).toEqual([{ marked: true, path: 'hooks/payload.cjs' }]);
      expect(findUnmarkedPaths(statuses)).toEqual([]);
    });

    it('accepts an exempt path even when unmarked', () => {
      const exempt = Object.keys(ATTRIBUTE_EXEMPT_PATHS)[0] ?? '';

      expect(findUnmarkedPaths([{ marked: false, path: exempt }])).toEqual([]);
    });
  });

  describe('suggestGlob', () => {
    it('suggests a folder glob, never the file name', () => {
      expect(suggestGlob('.gemini/hooks/skill-usage-capture.cjs')).toBe(
        '.gemini/hooks/*.cjs linguist-generated=true',
      );
    });

    it('handles a repo-root file', () => {
      expect(suggestGlob('NOTICES.md')).toBe(
        'NOTICES.md linguist-generated=true',
      );
    });
  });
});
