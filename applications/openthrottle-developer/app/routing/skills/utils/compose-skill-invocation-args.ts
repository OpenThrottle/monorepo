/**
 * @description Pure helpers for the structured Run-skill invocation: seeding
 * default field values, gating Run on required fields, and composing the args
 * portion of the `/<slug> ...` message from typed field values using the locked
 * named-flag encoding (`--<name> <value>`; bare `--<name>` for true booleans;
 * whitespace/quote-containing values double-quoted; empty optionals skipped).
 */
import type { SkillArgument } from '@openthrottle/openthrottle-skills';

/** A single declared argument's current field value. */
export type SkillArgumentValue = boolean | string;

/**
 * @description Seeds initial field values from each declaration's `default`:
 * booleans → `default === true` (else `false`); text/number/enum → the default
 * stringified (else empty string). Used to reset the form when the modal opens.
 */
export const seedSkillArgumentDefaults = (
  declarations: readonly SkillArgument[],
): Record<string, SkillArgumentValue> => {
  const seeded: Record<string, SkillArgumentValue> = {};

  for (const declaration of declarations) {
    if (declaration.type === 'boolean') {
      seeded[declaration.name] = declaration.default === true;
      continue;
    }

    seeded[declaration.name] =
      declaration.default === undefined ? '' : String(declaration.default);
  }

  return seeded;
};

/**
 * @description True when any required non-boolean argument has an empty value.
 * Booleans are never "missing" (they always carry true/false), so a required
 * boolean does not gate Run.
 */
export const hasMissingRequiredSkillArgs = (
  declarations: readonly SkillArgument[],
  values: Readonly<Record<string, SkillArgumentValue>>,
): boolean =>
  declarations.some((declaration) => {
    if (!declaration.required || declaration.type === 'boolean') {
      return false;
    }

    const value = values[declaration.name];
    return typeof value !== 'string' || value.trim() === '';
  });

const needsQuoting = (value: string): boolean =>
  /\s/.test(value) || value.includes('"');

const quoteValue = (value: string): string => `"${value.replace(/"/g, '\\"')}"`;

const formatValue = (value: string): string =>
  needsQuoting(value) ? quoteValue(value) : value;

/**
 * @description Composes the args portion of the invocation from structured field
 * values, in declaration order. Booleans render as a bare `--<name>` when true
 * (omitted when false); text/number/enum render as `--<name> <value>` (value
 * quoted when it contains whitespace or quotes); empty optional values are
 * skipped. Returns an empty string when nothing is set.
 */
export const composeSkillInvocationArgs = (
  declarations: readonly SkillArgument[],
  values: Readonly<Record<string, SkillArgumentValue>>,
): string => {
  const parts: string[] = [];

  for (const declaration of declarations) {
    const value = values[declaration.name];

    if (declaration.type === 'boolean') {
      if (value === true) {
        parts.push(`--${declaration.name}`);
      }
      continue;
    }

    const asString = typeof value === 'string' ? value.trim() : '';
    if (asString === '') {
      continue;
    }

    parts.push(`--${declaration.name}`, formatValue(asString));
  }

  return parts.join(' ');
};
