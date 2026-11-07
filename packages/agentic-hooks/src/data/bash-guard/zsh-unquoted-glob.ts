/**
 * Bash-guard rule `zsh-unquoted-glob`: under zsh, deny an unquoted glob that
 * zsh will refuse to run.
 *
 * zsh's default `NOMATCH` aborts the whole command with "no matches found"
 * when a filename pattern matches nothing — unlike bash, which passes the
 * pattern through. Two shapes recur in agent transcripts:
 *
 * - A glob in a flag value, `grep -rn x --include=*.ts` (2f8470fb #7,
 *   215ce37e #6). The pattern is the whole word, `--include=*.ts`, which
 *   names no file, so this is denied without touching the filesystem.
 * - A path glob that matches nothing, `ls applications/…/Dockerfile*`
 *   (215ce37e #5). Denied only when `BashGuardContext.globMatches` says so
 *   for the segment's directory.
 *
 * Quoted, escaped and `noglob` forms pass, as does anything with an
 * expansion (`$`, backtick, `~`, braces) the guard cannot evaluate statically,
 * and the pattern operands of `[[ … ]]` and `case`, which zsh never globs.
 * Off entirely when the shell is not zsh.
 *
 * @public
 */
import { readQuotedChars } from './shell-quoting.ts';
import { stripCommandPrefixes } from './shell-words.ts';
import {
  BASH_RULE_ALLOW,
  type BashGuardContext,
  type BashGuardRule,
  type BashRuleVerdict,
  type BashSegment,
} from './types.ts';

/**
 * Where an unquoted glob sits in one word: in a value after an unquoted `=`
 * (`flag-value`) or in the word itself (`path`). `pattern` is the word with
 * every quoted glob character backslash-escaped, ready for a glob matcher.
 *
 * @public
 */
export interface UnquotedGlob {
  readonly kind: 'flag-value' | 'path';
  readonly pattern: string;
}

interface GlobCandidate {
  readonly glob: UnquotedGlob;
  readonly word: string;
}

const GLOB_CHARS = '*?[';
const GLOB_META = '*?[]\\';

/** Words whose arguments zsh parses as assignments, which it does not glob. */
const ASSIGNMENT_BUILTINS: ReadonlySet<string> = new Set([
  'declare',
  'export',
  'float',
  'integer',
  'local',
  'readonly',
  'typeset',
]);

/** Commands whose operands zsh never globs. */
const PATTERN_COMMANDS: ReadonlySet<string> = new Set(['[[', 'case', 'noglob']);

/**
 * The unquoted glob in `raw`, a word as written, or null when there is none
 * or it carries an expansion the guard cannot evaluate statically.
 *
 * @public
 */
export const findUnquotedGlob = (raw: string): UnquotedGlob | null => {
  const chars = readQuotedChars(raw);
  let firstGlob = -1;
  let firstEquals = -1;
  chars.forEach(({ char, quote }, index) => {
    if (quote !== 'none') return;
    if (char === '=' && firstEquals === -1) firstEquals = index;
    if (firstGlob !== -1 || !GLOB_CHARS.includes(char)) return;
    const closesBracket =
      char !== '[' ||
      chars.some((later, laterIndex) => {
        return (
          laterIndex > index + 1 && later.char === ']' && later.quote === 'none'
        );
      });
    if (closesBracket) firstGlob = index;
  });
  if (firstGlob === -1) return null;

  const isUnevaluable = chars.some(({ char, quote }, index) => {
    if (char === '`' || (char === '$' && quote !== 'single')) return true;
    if (quote !== 'none') return false;
    return char === '{' || (char === '~' && index === 0);
  });
  if (isUnevaluable) return null;

  const pattern = chars
    .map(({ char, quote }) => {
      const isLiteral = quote !== 'none' && GLOB_META.includes(char);
      return isLiteral ? `\\${char}` : char;
    })
    .join('');
  const isFlagValue = firstEquals !== -1 && firstEquals < firstGlob;
  return { kind: isFlagValue ? 'flag-value' : 'path', pattern };
};

const quoteFlagValue = (word: string): string => {
  const equals = word.indexOf('=');
  if (equals === -1 || word.includes("'")) return `'${word}'`;
  return `${word.slice(0, equals + 1)}'${word.slice(equals + 1)}'`;
};

const globCandidates = (segment: BashSegment): readonly GlobCandidate[] => {
  const { words: bare } = stripCommandPrefixes(segment.words);
  const command = bare[0];
  if (command === undefined) return [];
  if (PATTERN_COMMANDS.has(command) || ASSIGNMENT_BUILTINS.has(command)) {
    return [];
  }
  const offset = segment.words.length - bare.length;
  const candidates: GlobCandidate[] = [];
  segment.rawWords.slice(offset + 1).forEach((raw, index) => {
    const glob = findUnquotedGlob(raw);
    if (glob !== null) candidates.push({ glob, word: bare[index + 1] ?? raw });
  });
  return candidates;
};

const checkSegment = async (
  segment: BashSegment,
  context: BashGuardContext,
): Promise<string | null> => {
  const candidates = globCandidates(segment);

  const flagValue = candidates.find(({ glob }) => glob.kind === 'flag-value');
  if (flagValue) {
    return `zsh treats the unquoted \`${flagValue.word}\` as a filename pattern and aborts with "no matches found" before the command runs. Quote the value: \`${quoteFlagValue(flagValue.word)}\`.`;
  }

  const { cwd } = segment;
  if (cwd === null) return null;
  const paths = candidates.filter(({ glob }) => glob.kind === 'path');
  const matches = await Promise.all(
    paths.map(({ glob }) => context.globMatches(glob.pattern, cwd)),
  );
  const unmatched = paths.find((_, index) => matches[index] === false);
  if (!unmatched) return null;
  return `zsh aborts with "no matches found": the unquoted glob \`${unmatched.word}\` matches nothing in ${cwd}. Quote it if the program should receive the pattern itself, or fix the path.`;
};

/** @public */
export const zshUnquotedGlobRule: BashGuardRule = {
  evaluate: async (command, context): Promise<BashRuleVerdict> => {
    if (context.shell !== 'zsh') return BASH_RULE_ALLOW;
    // Arithmetic `(( … ))` is split at its parentheses by the lexer, which
    // would make `2*3` look like a glob. Fail open on the whole command.
    if (command.raw.includes('((')) return BASH_RULE_ALLOW;
    const reasons = await Promise.all(
      command.segments.map((segment) => checkSegment(segment, context)),
    );
    const reason = reasons.find((found) => found !== null);
    return reason ? { decision: 'deny', reason } : BASH_RULE_ALLOW;
  },
  id: 'zsh-unquoted-glob',
};
