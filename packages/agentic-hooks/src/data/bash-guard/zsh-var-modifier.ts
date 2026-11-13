/**
 * Bash-guard rule `zsh-var-modifier`: under zsh, warn on an unbraced `$name:`
 * followed by a modifier letter.
 *
 * zsh applies history-style modifiers to parameter expansions, even inside
 * double quotes: `"$p:typecheck"` is `$p` with the `:t` (tail) modifier and a
 * literal `ypecheck`, not `$p` followed by `:typecheck`. Hit during plan
 * af00f30f's FEATURE_DELTA_PREVIEW task. The fix is `"${p}:typecheck"`.
 *
 * A warn, not a deny: the modifier is sometimes intended (`$f:t` is a real
 * zsh idiom), and only the author knows which. Single-quoted and escaped
 * forms are not expansions and pass. Off when the shell is not zsh.
 *
 * @public
 */
import { readQuotedChars } from './readQuotedChars.ts';
import {
  BASH_RULE_ALLOW,
  type BashGuardRule,
  type BashRuleVerdict,
} from './types.ts';

const MODIFIER_LETTERS = 'hterlaAuqQ';
const NAME_START = /[A-Za-z_]/;
const NAME_CHAR = /[A-Za-z0-9_]/;

/**
 * Every `$name:x` in `raw` (a word as written) that zsh would read as a
 * modifier, as the offending text (e.g. `$p:t`).
 *
 * @public
 */
export const findZshModifierExpansions = (raw: string): readonly string[] => {
  const chars = readQuotedChars(raw);
  const found: string[] = [];
  chars.forEach(({ char, quote }, index) => {
    if (char !== '$' || quote === 'single' || quote === 'escaped') return;
    if (!NAME_START.test(chars[index + 1]?.char ?? '')) return;
    let end = index + 1;
    while (NAME_CHAR.test(chars[end]?.char ?? '')) end += 1;
    const colon = chars[end];
    const modifier = chars[end + 1];
    if (colon?.char !== ':' || colon.quote !== quote) return;
    if (modifier === undefined || modifier.quote !== quote) return;
    if (!MODIFIER_LETTERS.includes(modifier.char)) return;
    const name = chars
      .slice(index + 1, end)
      .map((entry) => entry.char)
      .join('');
    found.push(`$${name}:${modifier.char}`);
  });
  return found;
};

/** @public */
export const zshVarModifierRule: BashGuardRule = {
  evaluate: async (command, context): Promise<BashRuleVerdict> => {
    if (context.shell !== 'zsh') return BASH_RULE_ALLOW;
    const hits = command.segments.flatMap((segment) => {
      return segment.rawWords.flatMap(findZshModifierExpansions);
    });
    const first = hits[0];
    if (first === undefined) return BASH_RULE_ALLOW;
    const colon = first.indexOf(':');
    const name = first.slice(1, colon);
    const letter = first.slice(colon + 1);
    return {
      decision: 'warn',
      reason: `zsh reads \`${first}…\` as \`$${name}\` with the \`:${letter}\` modifier applied, even inside double quotes. If you meant the variable followed by a colon, write \`\${${name}}:\`.`,
    };
  },
  id: 'zsh-var-modifier',
};
