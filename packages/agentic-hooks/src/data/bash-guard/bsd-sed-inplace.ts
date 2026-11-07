/**
 * Bash-guard rule `bsd-sed-inplace`: on macOS, deny the GNU spelling of
 * in-place `sed`.
 *
 * macOS ships BSD sed, whose `-i` always takes the next word as the backup
 * suffix. `sed -i 's/a/b/' file` therefore reads the script as a suffix and
 * the file name as the script, and fails with errors like "command a expects
 * \ followed by text" — after which agents retry with `sed -i ''`. Seen in
 * trajectories 215ce37e #33, 0ff1784d #22 and 2f8470fb sub#13–14.
 *
 * Passes: `sed -i '' …`, `sed -i.bak …`, `sed -i .bak …`, `sed -i -- …`, a
 * command that also spells the BSD form (the `sed -i '' … || sed -i …`
 * fallback idiom), and every `sed` off darwin.
 *
 * @public
 */
import { stripCommandPrefixes } from './shell-words.ts';
import {
  BASH_RULE_ALLOW,
  type BashGuardRule,
  type BashSegment,
} from './types.ts';

/** BSD sed options that take the following word as their value. */
const VALUE_FLAGS: ReadonlySet<string> = new Set(['-e', '-f']);

/** `-i` alone, or a cluster of value-less flags ending in it (`-Ei`, `-ni`). */
const INPLACE_FLAG = /^-[Ealnrsu]*i$/;

/** A separate word BSD sed would sensibly take as a suffix (`.bak`, `.orig`). */
const SUFFIX_WORD = /^\.[\w.-]*$/;

const isSedBinary = (word: string | undefined): boolean => {
  return word === 'sed' || (word?.endsWith('/sed') ?? false);
};

/**
 * How one simple command uses `sed -i`, read the way BSD sed's getopt would:
 * not at all (`none`), with a suffix argument BSD accepts (`suffixed`), or
 * in the GNU form with none (`suffixless`).
 *
 * @public
 */
export type SedInPlaceUse = 'none' | 'suffixed' | 'suffixless';

/** @public */
export const readSedInPlace = (words: readonly string[]): SedInPlaceUse => {
  const { words: bare } = stripCommandPrefixes(words);
  if (!isSedBinary(bare[0])) return 'none';

  for (let index = 1; index < bare.length; index += 1) {
    const word = bare[index] ?? '';
    if (word === '--' || !word.startsWith('-') || word === '-') return 'none';
    if (/^-i./.test(word)) return 'suffixed';
    if (VALUE_FLAGS.has(word)) {
      index += 1;
      continue;
    }
    if (INPLACE_FLAG.test(word)) {
      const next = bare[index + 1];
      if (next === undefined) return 'none';
      const isSuffix = next === '' || next === '--' || SUFFIX_WORD.test(next);
      return isSuffix ? 'suffixed' : 'suffixless';
    }
  }
  return 'none';
};

const REASON = `macOS ships BSD sed, where \`-i\` always takes the next word as a backup suffix, so the GNU form \`sed -i 's/…/…/' file\` fails ("command a expects \\ followed by text"). Write \`sed -i '' 's/…/…/' file\` (no backup) or \`sed -i.bak …\`, or make the edit with a script instead.`;

/** @public */
export const bsdSedInPlaceRule: BashGuardRule = {
  evaluate: async (command, context) => {
    if (context.platform !== 'darwin') return BASH_RULE_ALLOW;
    const uses = command.segments.map((segment: BashSegment) => {
      return readSedInPlace(segment.words);
    });
    // `sed -i '' … || sed -i …` is the portable-fallback idiom: a command that
    // already spells the BSD form somewhere knows what it is doing.
    const hit = uses.includes('suffixless') && !uses.includes('suffixed');
    return hit ? { decision: 'deny', reason: REASON } : BASH_RULE_ALLOW;
  },
  id: 'bsd-sed-inplace',
};
