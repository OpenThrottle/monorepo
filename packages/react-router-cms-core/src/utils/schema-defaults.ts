import type { CmsJsonSchema } from '../types/cms-json-schema';
import type { CmsFragmentDraft } from '../types/cms-render';

/**
 * @description The `default` of every property that declares one, keyed by property name — the
 * starting `properties` of a new fragment. Upstream skipped falsy defaults (`false`, `0`, `''`);
 * only a missing `default` is skipped here.
 * @public
 */
export const getSchemaDefaults = (schema: CmsJsonSchema): CmsFragmentDraft => {
  const { properties = {} } = schema;
  const entries = Object.entries(properties).filter((entry) => {
    return entry[1].default !== undefined;
  });

  return Object.fromEntries(
    entries.map(([key, property]) => {
      return [key, property.default];
    }),
  );
};
