import { z } from 'zod';

/**
 * @description The typed argument controls a skill can declare. Authored as an
 * `as const` tuple (not a TS enum): `text` → free text, `number` → numeric,
 * `boolean` → switch/checkbox, `enum` → single-choice select (requires `enum`).
 * @public
 */
export const SKILL_ARGUMENT_TYPES = [
  'boolean',
  'enum',
  'number',
  'text',
] as const;

/** @public */
export type SkillArgumentType = (typeof SKILL_ARGUMENT_TYPES)[number];

/**
 * @description The spec-compatible `metadata` key a SKILL.md uses to declare its
 * arguments. The value is a JSON string of `SkillArgument`-shaped objects, kept
 * as a string so it stays within the Agent Skills spec's free-form
 * `metadata` (string→string) map. See docs and the plan design gate.
 * @public
 */
export const SKILL_ARGUMENTS_METADATA_KEY = 'openthrottle-arguments';

/**
 * @description A single declared skill argument, normalized: `required` defaults
 * to `false`, `type` defaults to `text`, and `enum`-typed args always carry a
 * non-empty `enum` list (invalid ones are dropped at parse time).
 * @public
 */
export interface SkillArgument {
  readonly default: boolean | number | string | undefined;
  readonly description: string | undefined;
  readonly enum: readonly string[] | undefined;
  readonly name: string;
  readonly required: boolean;
  readonly type: SkillArgumentType;
}

const rawSkillArgumentSchema = z
  .object({
    default: z.union([z.string(), z.number(), z.boolean()]).optional(),
    description: z.string().trim().min(1).optional(),
    enum: z.array(z.string().trim().min(1)).min(1).optional(),
    name: z.string().trim().min(1),
    required: z.boolean().optional(),
    type: z.enum(SKILL_ARGUMENT_TYPES).optional(),
  })
  .strip();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeArgument = (
  raw: z.infer<typeof rawSkillArgumentSchema>,
): SkillArgument | undefined => {
  const type: SkillArgumentType = raw.type ?? 'text';

  // An enum control is meaningless without choices — drop it rather than
  // rendering an empty select.
  if (type === 'enum' && (raw.enum === undefined || raw.enum.length === 0)) {
    return undefined;
  }

  return {
    default: raw.default,
    description: raw.description,
    enum: type === 'enum' ? raw.enum : undefined,
    name: raw.name,
    required: raw.required ?? false,
    type,
  };
};

/**
 * @description Defensively parse a skill's declared arguments from the raw
 * frontmatter object's `metadata.openthrottle-arguments`. The value is normally
 * a JSON string (spec-fidelity), but an already-parsed inline YAML array is also
 * tolerated. Any malformed / absent declaration returns `undefined` — this NEVER
 * throws, so a bad declaration degrades to the free-text fallback instead of
 * breaking the skill loader. Individual malformed entries are dropped; a
 * declaration that yields zero valid entries returns `undefined`.
 * @public
 */
export const parseSkillArguments = (
  frontmatter: unknown,
): readonly SkillArgument[] | undefined => {
  if (!isRecord(frontmatter)) {
    return undefined;
  }

  const metadata = frontmatter.metadata;
  if (!isRecord(metadata)) {
    return undefined;
  }

  const rawValue = metadata[SKILL_ARGUMENTS_METADATA_KEY];
  if (rawValue === undefined || rawValue === null) {
    return undefined;
  }

  let candidate: unknown = rawValue;
  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    try {
      candidate = JSON.parse(trimmed);
    } catch {
      return undefined;
    }
  }

  if (!Array.isArray(candidate)) {
    return undefined;
  }

  const args: SkillArgument[] = [];
  for (const entry of candidate) {
    const parsed = rawSkillArgumentSchema.safeParse(entry);
    if (!parsed.success) {
      continue;
    }

    const normalized = normalizeArgument(parsed.data);
    if (normalized !== undefined) {
      args.push(normalized);
    }
  }

  return args.length > 0 ? args : undefined;
};
