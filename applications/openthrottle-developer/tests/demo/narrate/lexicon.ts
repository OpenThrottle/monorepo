/**
 * @description Pronunciation lexicon.
 *
 * Every TTS engine mangles this vocabulary by default, and it is audible on the
 * first listen: "OpenThrottle" as one word comes out with the stress in the wrong
 * place, initialisms get read as words, and "pgvector" is anyone's guess.
 *
 * Substitution happens on the SPOKEN text only. Captions use the written form, so
 * the viewer reads "MCP" while the voice says the letters.
 *
 * Order matters: longer keys are applied first so "OpenThrottle" is not partially
 * rewritten by a shorter rule.
 */

/**
 * @public The lexicon itself, exported so it can be inspected and tested apart from
 * `applyLexicon` — a mispronunciation is diagnosed by reading this table.
 */
export const PRONUNCIATIONS: ReadonlyArray<readonly [string, string]> = [
  ['OpenThrottle', 'Open Throttle'],
  ['openthrottle', 'Open Throttle'],
  ['pgvector', 'P G vector'],
  ['Postgres', 'Postgress'],
  ['PostgreSQL', 'Postgress Q L'],
  ['GraphQL', 'Graph Q L'],
  ['BullMQ', 'Bull M Q'],
  ['OpenCode', 'Open Code'],
  ['Codex', 'Codex'],
  ['Ollama', 'oh LAH ma'],
  ['MCP', 'M C P'],
  ['CLI', 'C L I'],
  ['API', 'A P I'],
  ['UI', 'U I'],
  ['YAML', 'yamel'],
  ['SQL', 'S Q L'],
  ['ffmpeg', 'F F meg'],
  ['Nx', 'N X'],
  ['pnpm', 'P N P M'],
  ['TTS', 'T T S'],
  ['LUFS', 'loofs'],
  ['429', 'four twenty nine'],
  ['503', 'five oh three'],
  ['9:16', 'nine by sixteen'],
  ['16:9', 'sixteen by nine'],
  ['Apache-2.0', 'Apache two'],
  // Leading-boundary only would turn "ready" into "reedy". applyLexicon special-cases
  // this key so the verb rewrites and the adjective does not.
  ['read', 'reed'],
];

/** Escape a literal for use inside a RegExp. */
const escape = (value: string): string =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/**
 * @description Match for one lexicon key. `read` must not eat `ready`.
 */
const lexiconPattern = (written: string): RegExp => {
  if (written === 'read') {
    return /\bread(?!y)/g;
  }

  return new RegExp(`\\b${escape(written)}`, 'g');
};

/**
 * Apply the lexicon. Leading word-boundary so "APIs" and "MCPs" still work, and
 * so a substring inside another word is left alone. `read` is narrower — a
 * trailing `y` is not rewritten, otherwise "ready" becomes "reedy".
 */
export const applyLexicon = (text: string): string => {
  let spoken = text;

  for (const [written, said] of PRONUNCIATIONS) {
    spoken = spoken.replaceAll(lexiconPattern(written), said);
  }

  return spoken;
};
