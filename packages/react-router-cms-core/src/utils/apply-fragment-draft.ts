import type { CmsFragment } from '../types/cms-fragment';
import type { CmsFragmentDraft } from '../types/cms-render';

/**
 * @description The tree with the draft merged over the properties of the fragment being edited, so
 * the preview shows unsaved edits as they are typed. Returns new objects; the input is untouched.
 * Upstream mutated the fragments in place while rendering.
 * @public
 */
export const applyFragmentDraft = (
  fragments: readonly CmsFragment[],
  uuid: string | undefined,
  draft: CmsFragmentDraft,
): readonly CmsFragment[] => {
  return fragments.map((fragment) => {
    const children = applyFragmentDraft(fragment.children, uuid, draft);
    const isEdited = fragment.uuid === uuid;
    const properties = isEdited
      ? { ...fragment.properties, ...draft }
      : fragment.properties;

    return { ...fragment, children, properties };
  });
};
