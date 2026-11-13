import { describe, expect, it, vi } from 'vitest';

import { bsdSedInPlaceRule, readSedInPlace } from '../bsd-sed-inplace.ts';
import { readQuotedChars } from '../readQuotedChars.ts';
import { evaluateBashGuard } from '../registry.ts';
import type { BashGuardContext, BashGuardRule, GlobMatcher } from '../types.ts';
import { findUnquotedGlob, zshUnquotedGlobRule } from '../zsh-unquoted-glob.ts';
import {
  findZshModifierExpansions,
  zshVarModifierRule,
} from '../zsh-var-modifier.ts';

const CWD = '/repo';

/** Evidence commands from plan c8eb0bdd's description, verbatim. */
const EVIDENCE = {
  dockerfileFlag: `grep -rn "FROM" . --include=Dockerfile*`,
  dockerfilePath: 'ls applications/openthrottle-server/Dockerfile*',
  gnuSed: `sed -i 's/…/'`,
  includeTs: 'grep -rn ... --include=*.ts',
  modifierLoop: `for p in agentic-hooks nodejs-utils; do pnpm nx run "$p:typecheck"; done`,
} as const;

const NO_MATCHES: GlobMatcher = async () => {
  return false;
};
const ALL_MATCH: GlobMatcher = async () => {
  return true;
};

const contextWith = (
  overrides: Partial<
    Pick<BashGuardContext, 'globMatches' | 'platform' | 'shell'>
  >,
): BashGuardContext => {
  return {
    background: false,
    cwd: CWD,
    globMatches: overrides.globMatches ?? NO_MATCHES,
    lookupPullRequest: vi.fn(async () => ({ kind: 'unknown' as const })),
    lookupTimeoutMs: 100,
    platform: overrides.platform ?? 'darwin',
    shell: overrides.shell === undefined ? 'zsh' : overrides.shell,
  };
};

const decide = async (
  rule: BashGuardRule,
  command: string,
  context: BashGuardContext = contextWith({}),
): Promise<string> => {
  const result = await evaluateBashGuard(command, context, [rule]);
  return result.decision;
};

describe('readQuotedChars', () => {
  it('marks each character with how it was quoted', () => {
    expect(readQuotedChars(`a'b'"c"\\d$'e'`)).toEqual([
      { char: 'a', quote: 'none' },
      { char: 'b', quote: 'single' },
      { char: 'c', quote: 'double' },
      { char: 'd', quote: 'escaped' },
      { char: 'e', quote: 'single' },
    ]);
  });
});

describe('bsd-sed-inplace', () => {
  describe('when the platform is darwin', () => {
    it.each([
      EVIDENCE.gnuSed,
      `sed -i 's/a/b/' file.txt`,
      `sed -i -e 's/a/b/' file.txt`,
      `sed -Ei 's/a+/b/' file.txt`,
      `cd x && LC_ALL=C sed -i "s/a/b/g" f`,
      `/usr/bin/sed -i 's/a/b/' f`,
    ])('denies %s', async (command) => {
      expect(await decide(bsdSedInPlaceRule, command)).toBe('deny');
    });

    it.each([
      `sed -i '' 's/a/b/' file.txt`,
      `sed -i "" -e 's/a/b/' file.txt`,
      `sed -i.bak 's/a/b/' file.txt`,
      `sed -i .bak 's/a/b/' file.txt`,
      `sed -i -- ''`,
      `sed -n 's/a/b/p' file.txt`,
      `sed -e 's/a/b/' -i '' f`,
      `echo "sed -i 's/a/b/'"`,
      `sed -i '' 's/a/b/' f 2>/dev/null || sed -i 's/a/b/' f`,
    ])('allows %s', async (command) => {
      expect(await decide(bsdSedInPlaceRule, command)).toBe('allow');
    });
  });

  describe('when the platform is not darwin', () => {
    it('is inert', async () => {
      const context = contextWith({ platform: 'linux' });
      expect(await decide(bsdSedInPlaceRule, EVIDENCE.gnuSed, context)).toBe(
        'allow',
      );
    });
  });

  it('reads a value flag before -i as taking its value', () => {
    expect(readSedInPlace(['sed', '-f', '-i', 'x'])).toBe('none');
  });
});

describe('findUnquotedGlob', () => {
  it('classifies a glob after = as a flag value', () => {
    expect(findUnquotedGlob('--include=*.ts')).toEqual({
      kind: 'flag-value',
      pattern: '--include=*.ts',
    });
  });

  it('escapes quoted glob characters in the pattern', () => {
    expect(findUnquotedGlob(`src/'[x]'*.ts`)).toEqual({
      kind: 'path',
      pattern: 'src/\\[x\\]*.ts',
    });
  });

  it.each([
    `--include='*.ts'`,
    `--include="*.ts"`,
    '--include=\\*.ts',
    '$HOME/*.ts',
    '~/x*',
    'src/{a,b}/*.ts',
    '[',
    '[[',
  ])('finds nothing in %s', (raw) => {
    expect(findUnquotedGlob(raw)).toBeNull();
  });
});

describe('zsh-unquoted-glob', () => {
  describe('when the shell is zsh', () => {
    it.each([EVIDENCE.includeTs, EVIDENCE.dockerfileFlag])(
      'denies the flag-value glob in %s without asking the filesystem',
      async (command) => {
        const globMatches = vi.fn(ALL_MATCH);
        const context = contextWith({ globMatches });
        expect(await decide(zshUnquotedGlobRule, command, context)).toBe(
          'deny',
        );
      },
    );

    it('denies a path glob that matches nothing', async () => {
      const globMatches = vi.fn(NO_MATCHES);
      const context = contextWith({ globMatches });
      expect(
        await decide(zshUnquotedGlobRule, EVIDENCE.dockerfilePath, context),
      ).toBe('deny');
      expect(globMatches).toHaveBeenCalledWith(
        'applications/openthrottle-server/Dockerfile*',
        CWD,
      );
    });

    it('allows a path glob that matches', async () => {
      const context = contextWith({ globMatches: ALL_MATCH });
      expect(
        await decide(zshUnquotedGlobRule, EVIDENCE.dockerfilePath, context),
      ).toBe('allow');
    });

    it('checks the path glob in the directory a cd moved to', async () => {
      const globMatches = vi.fn(NO_MATCHES);
      await decide(
        zshUnquotedGlobRule,
        'cd packages && ls *.md',
        contextWith({ globMatches }),
      );
      expect(globMatches).toHaveBeenCalledWith('*.md', '/repo/packages');
    });

    it.each([
      `grep -rn x . --include='*.ts'`,
      `grep -rn x . --include="*.ts"`,
      'grep -rn x . --include=\\*.ts',
      `ls 'applications/openthrottle-server/Dockerfile*'`,
      'noglob ls Dockerfile*',
      'FOO=*.ts make',
      'export FOO=*.ts',
      '[[ $f == *.ts ]]',
      'case $f in *.ts) echo ts ;; esac',
      'echo $(( 2*3 ))',
      'ls $DIR/*.ts',
      'ls ~/x*',
      'cd "$X" && ls *.ts',
    ])('allows %s', async (command) => {
      expect(await decide(zshUnquotedGlobRule, command)).toBe('allow');
    });

    it('fails open on a path glob the matcher cannot decide', async () => {
      const context = contextWith({ globMatches: ALL_MATCH });
      expect(await decide(zshUnquotedGlobRule, 'ls src/*.zz', context)).toBe(
        'allow',
      );
    });
  });

  describe('when the shell is not zsh', () => {
    it.each(['bash', null])('is inert under %s', async (shell) => {
      const context = contextWith({ shell });
      expect(
        await decide(zshUnquotedGlobRule, EVIDENCE.includeTs, context),
      ).toBe('allow');
      expect(
        await decide(zshUnquotedGlobRule, EVIDENCE.dockerfilePath, context),
      ).toBe('allow');
    });
  });
});

describe('findZshModifierExpansions', () => {
  it('finds the modifier in a double-quoted word', () => {
    expect(findZshModifierExpansions('"$p:typecheck"')).toEqual(['$p:t']);
  });

  it.each([
    `'$p:typecheck'`,
    '"${p}:typecheck"',
    '"\\$p:typecheck"',
    '"$host:443"',
    '"$PATH:$HOME/bin"',
    '"$p":typecheck',
  ])('finds nothing in %s', (raw) => {
    expect(findZshModifierExpansions(raw)).toEqual([]);
  });
});

describe('zsh-var-modifier', () => {
  describe('when the shell is zsh', () => {
    it('warns on the evidence loop, suggesting braces', async () => {
      const result = await evaluateBashGuard(
        EVIDENCE.modifierLoop,
        contextWith({}),
        [zshVarModifierRule],
      );
      expect(result.decision).toBe('warn');
      if (result.decision === 'warn') {
        expect(result.findings[0]?.reason).toContain('${p}:');
      }
    });

    it.each([
      `for p in a b; do pnpm nx run "\${p}:typecheck"; done`,
      `echo '$p:typecheck'`,
    ])('allows %s', async (command) => {
      expect(await decide(zshVarModifierRule, command)).toBe('allow');
    });
  });

  describe('when the shell is not zsh', () => {
    it('is inert', async () => {
      const context = contextWith({ shell: 'bash' });
      expect(
        await decide(zshVarModifierRule, EVIDENCE.modifierLoop, context),
      ).toBe('allow');
    });
  });
});
