/**
 * @description Builds the seeded SKILL.md a new skill starts from: a frontmatter
 * block plus a minimal body, ready to open in the editor.
 *
 * The emitted block carries ONLY the four legal keys — `name`, `description`,
 * and the optional `tags` and `disable-model-invocation`. Note the failure mode
 * is quieter than the `.strict()` on `skillFrontmatterSchema` suggests:
 * `parseSkillFrontmatterForValidation` whitelists those same four keys before
 * the schema ever sees them, so an invented key is not rejected — it is silently
 * DROPPED at ingest, and the author never learns their key did nothing. Emitting
 * only legal keys is the whole defence. The scaffold is round-tripped through
 * `validateAgentAssetFrontmatter` in its own test rather than trusted.
 *
 * Frontmatter is parsed by a real YAML 1.2 parser, so values are emitted as
 * double-quoted scalars whenever a plain scalar would be ambiguous (a `: `, a
 * leading indicator character, a `#` comment start, a value YAML would read as a
 * boolean or number, …). Double-quoted YAML uses JSON's escape grammar, so
 * `JSON.stringify` is an exact encoder for that form — not an approximation.
 *
 * Pure and dependency-free on purpose: the create form seeds the editor with
 * this on the client, and the server re-derives nothing from it.
 */

/** A plain YAML scalar is only safe when none of this is true. */
const YAML_PLAIN_UNSAFE_PATTERN =
  /^$|^[-?:,[\]{}#&*!|>'"%@`]|^\s|\s$|:\s|\s#|[\n\r\t]/;

/**
 * Values YAML 1.2 core would resolve to a non-string type. Quoting these keeps
 * `description: true` a string rather than a boolean the schema then rejects.
 */
const YAML_NON_STRING_PATTERN = /^(?:true|false|null|~|[-+]?\d+(?:\.\d+)?)$/i;

/**
 * @description Emits `value` as a YAML scalar: plain when unambiguous, else
 * double-quoted via JSON's (identical) escape grammar.
 */
const toYamlScalar = (value: string): string =>
  YAML_PLAIN_UNSAFE_PATTERN.test(value) || YAML_NON_STRING_PATTERN.test(value)
    ? JSON.stringify(value)
    : value;

export interface BuildSkillScaffoldInput {
  /** The `description` key — the only thing a model sees when deciding to fire the skill. */
  readonly description: string;
  /** Emits `disable-model-invocation` only when explicitly `true`. */
  readonly disableModelInvocation?: boolean;
  /** The `name` key; must equal the directory slug or the create action refuses it. */
  readonly name: string;
  /** Emits a `tags` flow sequence only when non-empty. */
  readonly tags?: readonly string[];
}

/**
 * @description The description placeholder a blank scaffold starts with. It is
 * written in the catalog's trigger-phrase style because the description is the
 * whole basis on which a model decides to open the skill — a vague one never
 * fires. Mirrors `skills/ot-skill-sync/scripts/personal.sh`'s template wording.
 */
export const SKILL_SCAFFOLD_DESCRIPTION_PLACEHOLDER = `TODO — what this does in one clause. USE WHEN <the trigger phrases and situations that should fire it>. NOT FOR <the nearest thing it should not be confused with>.`;

/**
 * @description Builds a complete, schema-valid SKILL.md for a new skill.
 * Blank-but-valid is deliberate: the file must validate on its very first save,
 * so an empty description falls back to the placeholder rather than emitting a
 * key the strict schema rejects for being empty.
 */
export const buildSkillScaffold = (input: BuildSkillScaffoldInput): string => {
  const { description, disableModelInvocation, name, tags } = input;

  const trimmedDescription = description.trim();
  const resolvedDescription =
    trimmedDescription.length > 0
      ? trimmedDescription
      : SKILL_SCAFFOLD_DESCRIPTION_PLACEHOLDER;

  const cleanedTags = (tags ?? [])
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  const frontmatterLines = [
    `name: ${toYamlScalar(name)}`,
    `description: ${toYamlScalar(resolvedDescription)}`,
  ];

  if (cleanedTags.length > 0) {
    frontmatterLines.push(
      `tags: [${cleanedTags.map((tag) => toYamlScalar(tag)).join(', ')}]`,
    );
  }

  if (disableModelInvocation === true) {
    frontmatterLines.push(`disable-model-invocation: true`);
  }

  return `---
${frontmatterLines.join('\n')}
---

# ${name}

TODO — the body. It costs nothing until the skill actually fires, so put the
detail here and keep the description above to trigger conditions only.

## When to use this

## Steps

1.
`;
};
