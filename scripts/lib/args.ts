/**
 * @description Tiny flag helpers for repo scripts.
 *
 * Decision (task edbb0b48): we standardize on these helpers rather than
 * node:util's parseArgs. Existing scripts all follow the bare
 * `process.argv.includes('--strict')` convention — boolean flags, the odd
 * `--name=value`, and positionals — and parseArgs' option-declaration
 * ceremony buys nothing at that scale. These helpers keep the exact
 * conventions (`--strict`, `--json`, `--check`) while making them testable.
 */

/** The script's own arguments (everything after the script path). */
export const scriptArgs = (argv: string[] = process.argv): string[] =>
  argv.slice(2);

/** True when the boolean flag is present (`--strict`). */
export const hasFlag = (
  name: string,
  args: string[] = scriptArgs(),
): boolean => args.includes(`--${name}`) || args.some((arg) => arg.startsWith(`--${name}=`)); // prettier-ignore

/**
 * The value of a `--name=value` or `--name value` flag, or undefined when
 * absent (or present with no value).
 */
export const flagValue = (
  name: string,
  args: string[] = scriptArgs(),
): string | undefined => {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));

  if (inline !== undefined) {
    return inline.slice(prefix.length);
  }

  const index = args.indexOf(`--${name}`);
  const next = index >= 0 ? args[index + 1] : undefined;

  return next !== undefined && !next.startsWith('--') ? next : undefined;
};

/**
 * Arguments that are not flags and not a flag's value. A bare token after
 * `--flag` is ambiguous without a spec, so callers list their value-taking
 * flags in `valueFlags`; only those consume the following token. (Prefer the
 * unambiguous `--flag=value` form in new scripts.)
 */
export const positionals = (
  args: string[] = scriptArgs(),
  valueFlags: string[] = [],
): string[] => {
  const result: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg.startsWith('--')) {
      continue;
    }

    const previous = index > 0 ? args[index - 1] : undefined;
    const consumedByFlag =
      previous !== undefined &&
      valueFlags.some((name) => previous === `--${name}`);

    if (consumedByFlag) {
      continue;
    }

    result.push(arg);
  }

  return result;
};
