import type { CmsJsonSchema } from '../types/cms-json-schema';

const DEFINITIONS_PREFIX = '#/definitions/';

const collectRefs = (value: unknown, refs: Set<string>): void => {
  if (Array.isArray(value)) {
    value.forEach((item) => {
      collectRefs(item, refs);
    });
    return;
  }

  if (typeof value !== 'object' || value === null) {
    return;
  }

  Object.entries(value).forEach(([key, child]) => {
    const isLocalRef =
      typeof child === 'string' && child.startsWith(DEFINITIONS_PREFIX);

    if (key === '$ref' && isLocalRef) {
      refs.add(child.slice(DEFINITIONS_PREFIX.length));
    }

    if (key !== '$ref' && key !== 'definitions') {
      collectRefs(child, refs);
    }
  });
};

/**
 * @description The names of the definitions a schema refers to directly (`$ref:
 * "#/definitions/<name>"`), not following refs inside those definitions. Refs that do not point into
 * `definitions` are ignored; upstream threw on them.
 * @public
 */
export const schemaFindRefs = (schema: CmsJsonSchema): ReadonlySet<string> => {
  const refs = new Set<string>();

  collectRefs(schema, refs);

  return refs;
};

/**
 * @description Every definition a schema uses, following refs through the definitions themselves.
 * Cycles are visited once.
 * @public
 */
export const schemaFindRefsRecursive = (
  schema: CmsJsonSchema,
): ReadonlySet<string> => {
  const found = new Set<string>();
  const queue = [...schemaFindRefs(schema)];

  while (queue.length > 0) {
    const name = queue.shift();
    const definition =
      name === undefined ? undefined : schema.definitions?.[name];

    if (name !== undefined && !found.has(name)) {
      found.add(name);
      queue.push(
        ...(definition === undefined ? [] : schemaFindRefs(definition)),
      );
    }
  }

  return found;
};

/**
 * @description A copy of the schema keeping only the definitions it actually uses, and no
 * `definitions` key at all when it uses none.
 * @link https://github.com/YousefED/typescript-json-schema/issues/172
 * @public
 */
export const shrinkSchema = (schema: CmsJsonSchema): CmsJsonSchema => {
  const { definitions = {}, ...rest } = schema;
  const used = schemaFindRefsRecursive(schema);
  const kept = Object.entries(definitions).filter(([name]) => {
    return used.has(name);
  });

  if (kept.length === 0) {
    return rest;
  }

  return { ...rest, definitions: Object.fromEntries(kept) };
};
